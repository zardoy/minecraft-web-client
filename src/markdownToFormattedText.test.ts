import { describe, expect, it } from 'vitest'
import markdownToFormattedText from './markdownToFormattedText'

describe('markdownToFormattedText', () => {
  it('should convert markdown to formatted text', () => {
    const markdown = '**bold** *italic* [link](https://example.com) k `code`'
    const text = markdownToFormattedText(markdown)
    const command =
      "/data merge block ~ ~ ~ {Text1:'" +
      JSON.stringify(text[0]) +
      "',Text2: '" +
      JSON.stringify(text[1]) +
      "',Text3:'" +
      JSON.stringify(text[2]) +
      "',Text4:'" +
      JSON.stringify(text[3]) +
      "'}" // mojangson
    expect(text).toMatchInlineSnapshot(`
      [
        [
          [
            {
              "bold": true,
              "text": "bold",
            },
            {
              "text": " ",
            },
            {
              "italic": true,
              "text": "italic",
            },
            {
              "text": " ",
            },
            {
              "text": " k ",
            },
            "code",
          ],
        ],
        "",
        "",
        "",
      ]
    `)
  })
})
