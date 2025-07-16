import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { injectableTool } from './util.js'

export type DbCrudToolsOptions = {
  /** Optional project id – for parity with other tool factories */
  projectId?: string
}

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables – they are required for CRUD tools.'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  })
}

export function getDbCrudTools({ projectId }: DbCrudToolsOptions = {}) {
  const project_id = projectId // injected but unused

  return {
    insert_row: injectableTool({
      description: 'Insert a single row into a table and return the inserted record.',
      parameters: z.object({
        project_id: z.string().optional(),
        table: z.string(),
        values: z.record(z.unknown()).describe('Key/value pairs for the row'),
      }),
      inject: { project_id },
      execute: async ({ table, values }) => {
        const client = getClient()
        const { data, error } = await client.from(table).insert(values).select()
        if (error) throw error
        return data
      },
    }),

    select_rows: injectableTool({
      description: 'Select rows from a table with optional filters.',
      parameters: z.object({
        project_id: z.string().optional(),
        table: z.string(),
        match: z.record(z.string()).optional().describe('Exact match filters'),
        limit: z.number().optional(),
      }),
      inject: { project_id },
      execute: async ({ table, match, limit }) => {
        const client = getClient()
        let query = client.from(table).select('*')
        if (match) query = query.match(match)
        if (limit) query = query.limit(limit)
        const { data, error } = await query
        if (error) throw error
        return data
      },
    }),

    update_rows: injectableTool({
      description: 'Update rows in a table using match filters and return updated rows.',
      parameters: z.object({
        project_id: z.string().optional(),
        table: z.string(),
        match: z.record(z.string()).describe('Filters identifying rows to update'),
        values: z.record(z.unknown()).describe('Columns to update'),
      }),
      inject: { project_id },
      execute: async ({ table, match, values }) => {
        const client = getClient()
        const { data, error } = await client.from(table).update(values).match(match).select()
        if (error) throw error
        return data
      },
    }),

    delete_rows: injectableTool({
      description: 'Delete rows from a table using match filters and return deleted rows.',
      parameters: z.object({
        project_id: z.string().optional(),
        table: z.string(),
        match: z.record(z.string()).describe('Filters identifying rows to delete'),
      }),
      inject: { project_id },
      execute: async ({ table, match }) => {
        const client = getClient()
        const { data, error } = await client.from(table).delete().match(match).select()
        if (error) throw error
        return data
      },
    }),
  }
}
