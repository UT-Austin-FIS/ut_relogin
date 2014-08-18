from django.conf import settings

TAGS = """
<script src="{static_url}ut_relogin/jquery-1.11.1.min.js"></script>
<script src="{static_url}ut_relogin/jquery.utRelogin.js"></script>
<script>
    var $jqUtRelogin = jQuery.noConflict(true);
    $jqUtRelogin.utRelogin();
</script>
"""


class UtReloginHeadTagMiddleware(object):

    def process_response(self, request, response):
        if 'html' in response['Content-Type'].lower():
            tags = TAGS.format(static_url=settings.STATIC_URL)
            tags = '\n'.join([tags, '</head>'])
            response.content = response.content.replace(u'</head>', tags, 1)
        return response
