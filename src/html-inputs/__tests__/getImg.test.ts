import {
  kitchenSinkRoot,
  optionsHtml,
} from '$test/helpers/mv2-kitchen-sink-paths'
import { getImgSrcs, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct img tags and favicons', () => {
  const result = getImgSrcs(html$)

  expect(result).toEqual(
    expect.arrayContaining([
      'test/examples/mv2-kitchen-sink/options.png',
      'test/examples/mv2-kitchen-sink/options.jpg',
      'test/examples/mv2-kitchen-sink/images/favicon.png',
    ]),
  )
})
