from django.shortcuts import render_to_response


def redirected(request):
    return render_to_response('ut_relogin/redirected.html')
