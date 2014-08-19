from django.conf.urls import url, patterns

from ut_relogin.views import redirected

urlpatterns = patterns(
    '',
    url(r'^ut_relogin/redirect/$', redirected, name='ut_relogin_redirect'),
)
