from html.parser import HTMLParser

class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.void_tags = {'meta', 'link', 'img', 'br', 'hr', 'input', 'source'}
    def handle_starttag(self, tag, attrs):
        if tag not in self.void_tags:
            self.stack.append((tag, self.getpos()))
    def handle_endtag(self, tag):
        if tag in self.void_tags:
            return
        if not self.stack:
            print('Extra end tag:', tag, 'at', self.getpos())
            return
        last, pos = self.stack.pop()
        if last != tag:
            print(f'Mismatched tag: expected </{last}> from {pos}, got </{tag}> at {self.getpos()}')

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

checker = TagChecker()
checker.feed(html)
if checker.stack:
    print('Unclosed tags at EOF:', checker.stack)
else:
    print('SUCCESS: All HTML tags in public/index.html are perfectly balanced!')
