const { escapeHtml } = require('../public/modules/safe-html.js');

test('escapeHtml converts special chars', () => {
  expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
});
