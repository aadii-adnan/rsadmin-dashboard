from django import template
register = template.Library()

@register.filter
def get_item(dictionary, key):
    try:
        val = dictionary.get(key, '')
        if val:
            return val[0] 
    except Exception:
        return ''