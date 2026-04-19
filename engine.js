const { Marp } = require('@marp-team/marp-core')
const { JSDOM } = require('jsdom')
const crypto = require('crypto')

module.exports = async (opts) => {
  const { createHTMLWindow } = require('svgdom')
  const { default: createDOMPurify } = await import('dompurify')
  const { default: mermaid } = await import('mermaid')

  // DOMPurify needs a JSDOM window to initialize
  const jsdomWindow = new JSDOM('').window
  const DOMPurify = createDOMPurify(jsdomWindow)
  Object.assign(createDOMPurify, DOMPurify)

  // Mermaid needs an SVG-capable window for rendering
  const svgWindow = createHTMLWindow()
  global.window = svgWindow
  global.document = svgWindow.document

  mermaid.initialize({ startOnLoad: false, htmlLabels: false, securityLevel: 'strict' })

  const cache = new Map()

  const renderDiagram = async (content) => {
    if (cache.has(content)) return cache.get(content)
    const id = `mermaid${crypto.randomBytes(4).toString('hex')}`
    const { svg } = await mermaid.render(id, content)
    cache.set(content, `<div class="mermaid-diagram">${svg}</div>`)
    return cache.get(content)
  }

  const mermaidPlugin = (md) => {
    const fence = md.renderer.rules.fence?.bind(md.renderer.rules)
    md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
      const token = tokens[idx]
      if (token.info.trim() === 'mermaid') {
        return cache.get(token.content.trim()) ?? '<pre>Mermaid diagram not rendered</pre>'
      }
      return fence ? fence(tokens, idx, options, env, slf) : ''
    }
  }

  const instance = new Marp(opts).use(mermaidPlugin)
  const _render = instance.render.bind(instance)

  instance.render = async (markdown, env) => {
    const blocks = [...markdown.matchAll(/^```mermaid\r?\n([\s\S]*?)^```/gm)]
    await Promise.all(blocks.map(([, content]) => renderDiagram(content.trim())))
    return _render(markdown, env)
  }

  return instance
}
