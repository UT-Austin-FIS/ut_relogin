from django.conf.urls import url
from django.test import override_settings, TestCase
from django.http import HttpResponse

from ut_relogin.urls import urlpatterns

MINIMAL_HTML5_DOC = b'<!DOCTYPE html><html><head><title>title</title></head><body></body></html>'

urlpatterns += [
    url(r'^$', lambda request: HttpResponse(content=MINIMAL_HTML5_DOC)),
]


@override_settings(ROOT_URLCONF='tests.test_middleware',)
class TestMiddleware(TestCase):
    def test_replace_header_tag(self):
        with self.modify_settings(MIDDLEWARE_CLASSES={'append': 'ut_relogin.middleware.UtReloginHeadTagMiddleware'},
                                  MIDDLEWARE={'append': 'ut_relogin.middleware.UtReloginHeadTagMiddleware'}):
            resp = self.client.get('/')
            self.assertContains(resp, '/static/ut_relogin/jquery.utRelogin.js', count=1)
