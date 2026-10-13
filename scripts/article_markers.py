"""Only display source-backed, explicitly assigned article markers."""
import html
import json

def marker(article, root):
    path=root/'data/reperes.json'
    data=json.loads(path.read_text(encoding='utf-8')).get('articles',{}) if path.exists() else {}
    entry=data.get(article.get('id'),{})
    if not entry.get('label') or entry.get('source')!=article.get('source'):
        return ''
    esc=lambda value:html.escape(str(value),quote=True)
    return '<p class="article-marker" title="'+esc(entry.get('detail',''))+'"><span>'+esc(entry['label'])+'</span></p>'
