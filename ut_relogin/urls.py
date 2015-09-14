from django.conf.urls import url

from ut_relogin.views import ReloginRedirect, FormProtectionView

urlpatterns = [
    url(
        r'^redirect/$',
        ReloginRedirect.as_view(),
        name='ut_relogin_redirect',
    ),
    url(
        r'^form_protection/$',
        FormProtectionView.as_view(),
        name='ut_relogin_form_protection',
    ),
]
