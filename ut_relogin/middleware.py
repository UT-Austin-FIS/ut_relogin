from django.conf import settings
from django.core.urlresolvers import reverse

TAGS = """
<head>
    <script src="{static_url}ut_relogin/jquery-1.11.1.min.js"></script>
    <script src="{static_url}ut_relogin/jquery.utRelogin.js"></script>
    <script>
        var $jqUtRelogin = jQuery.noConflict(true);
        $jqUtRelogin.utRelogin({{
            'popupUrl': '{popup_url}',
            'formProtectUrl': '{form_url}',
        }});
    </script>
""".format(
    static_url=settings.STATIC_URL,
    popup_url=reverse('ut_relogin_redirect'),
    form_url=reverse('ut_relogin_form_protection'),
)


class UtReloginHeadTagMiddleware(object):

    def get_head_tag_replacement(self):
        """
        Get the string that replaces <head> tags in HTML responses. Can be
        overridden if TAGS is not quite what you're looking for.
        """
        return TAGS

    def process_response(self, request, response):
        if 'html' in response['Content-Type'].lower():
            tags = self.get_head_tag_replacement()
            response.content = response.content.replace(u'<head>', tags, 1)
        return response
