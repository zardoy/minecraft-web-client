import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown'
import { exampleSetup, buildMenuItems } from 'prosemirror-example-setup'
import { MarkSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

export class ProseMirrorView {
  view

  constructor(target, content) {
    console.log('schema.marks', schema.marks)
    //@ts-expect-error
    schema.marks.textColor = {
      spec: {
        attrs: { color: {} },
        inline: true,
        parseDOM: [
          {
            style: 'color',
            getAttrs: value => ({ color: value })
          }
        ],
        toDOM: mark => ['span', { style: `color: ${mark.attrs.color}` }, 0]
      }
    }

    const fullMenu = buildMenuItems(schema).fullMenu as Array<Array<import('prosemirror-menu').MenuItem>>
    fullMenu[0] = fullMenu[0].filter(item => item.spec.title !== 'Add or remove link' && item.spec.title !== 'Toggle code font')
    fullMenu.splice(3, 1) // remove the insert list, quote & checkbox menu
    ;(fullMenu[1][0] as any).options.label = 'Color' // check-build error: fullMenu[1][0].options.label = 'Color'
    // fullMenu[1][0].content[0].spec.label = 'Red'
    // fullMenu[1][0].content[0].spec.run = (state, dispatch, view) => {
    // console.log('state', state)
    // // make <p style="color: red">...</p>
    // const { from, to } = state.selection
    // const { tr } = state
    // console.log(schema.marks)
    // tr.addMark(from, to, schema.marks.textColor.create({ color: 'red' }))
    // dispatch(tr)
    //   toggleMark(schema.marks.textColor, { color: 'red' })(state, dispatch, view)
    // }
    fullMenu[1].splice(1, 1) // remove the type menu
    console.log('fullMenu', fullMenu)
    this.view = new EditorView(target, {
      state: EditorState.create({
        doc: defaultMarkdownParser.parse(content) ?? undefined,
        plugins: exampleSetup({
          schema,
          menuContent: fullMenu
        })
      }),
      attributes(state) {
        return {
          autocorrect: 'off',
          autocapitalize: 'off',
          spellcheck: 'false',
          autofocus: 'true'
        }
      }
    })
  }

  get content() {
    const content = defaultMarkdownSerializer.serialize(this.view.state.doc)
    console.log('content', content)
    return content
  }

  focus() {
    this.view.focus()
  }

  destroy() {
    this.view.destroy()
  }
}
