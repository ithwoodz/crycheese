import type { IncomingMessage, ServerResponse } from 'node:http'
import { createRunnMiddleware } from '../server/api.js'

const middleware = createRunnMiddleware(process.env as Record<string, string>)

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return middleware(req, res)
}
