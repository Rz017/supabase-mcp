import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { injectableTool } from './util.js'
import { randomUUID } from 'crypto'

export type UploadFileToolsOptions = {
  projectId?: string
}

function getClient() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables – required for Storage upload.')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export function getUploadFileTools({ projectId }: UploadFileToolsOptions = {}) {
  const project_id = projectId

  return {
    upload_file_to_bucket: injectableTool({
      description: 'Upload a file (base64) to a Supabase Storage bucket and return upload result.',
      parameters: z.object({
        project_id: z.string().optional(),
        bucket: z.string(),
        file_path: z.string().optional().describe('Destination path/key in bucket; defaults to random uuid'),
        content_type: z.string().optional().default('application/octet-stream'),
        file_base64: z.string().describe('Base64-encoded file contents'),
      }),
      inject: { project_id },
      execute: async ({ bucket, file_path, content_type, file_base64 }) => {
        const client = getClient()
        const path = file_path ?? randomUUID()
        const buffer = Buffer.from(file_base64, 'base64')
        const { data, error } = await client.storage.from(bucket).upload(path, buffer, {
          contentType: content_type,
        })
        if (error) throw error
        return data
      },
    }),
  }
}
