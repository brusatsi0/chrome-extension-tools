import { loadHtml, getCssHrefs } from '../cheerio'
import {
  kitchenSinkRoot,
  optionsHtml,
} from '$test/data/mv2-kitchen-sink-paths'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct stylesheets', () => {
  const result = getCssHrefs(html$)

  expect(result).toEqual(['test/mv2-kitchen-sink/options.css'])
})
