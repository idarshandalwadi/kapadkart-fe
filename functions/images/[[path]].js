import { proxyRequest } from '../_lib/upstream.js'

export function onRequest(context) {
  return proxyRequest(context.request)
}
