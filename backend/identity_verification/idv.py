import uuid
from random import randrange


from attributes.models import epoch_start
from django.conf import settings
from django.utils import timezone

from users.models import PaipassUser

from api.models import (PhoneVerificationSession,
                        EmailVerificationSession,
                        PhoneVerifStatusChoices,
                        EmailVerifStatusChoices,
                        ResetPasswordSession,
                        SecondFactorAuthSession)


def get_phone_verification_code():
    return str(randrange(0, 99999, 1)).zfill(5)


def aws_send_verification_text(phone_number, verification_code):
    sns = settings.AWS_API.client(service_name='sns',
                         region_name=settings.AWS_REGION_NAME)

    if not phone_number.startswith('+'):
        phone_number = '+1' + phone_number

    msg_prefix = "Your PAI Pass Verification Code is:\n"
    response = sns.publish(PhoneNumber=phone_number,
                           Message=msg_prefix + verification_code
                           )
    return response


def send_verification_text(user, new_phone=None):
    if new_phone is not None:
        phone_to_send_text = new_phone
    elif user.phone_verification_request is not None:
        phone_to_send_text = user.phone_verification_request.phone_number
    elif user.phone_number is not None:
        phone_to_send_text = user.phone_number
    else:
        raise Exception('No phone number found to send ')

    qs = PhoneVerificationSession.objects.all().filter(user=user)
    # TODO make phone numbers unique
    # if qs.count() > 0 and qs.first().user != user:
    #    raise Exception("Phone number already exists under a different user!")
    verification_code = get_phone_verification_code()

    if qs.count() > 0 and qs.first().user == user:
        pvs = qs.first()
        if pvs.status == PhoneVerifStatusChoices.ACCEPTED and pvs.phone_number == phone_to_send_text:
            return pvs
        pvs.status = PhoneVerifStatusChoices.PENDING
        pvs.phone_number = phone_to_send_text
        pvs.verification_code = verification_code

        pvs.save()
    else:
        pvs = PhoneVerificationSession.objects.create(user=user,
                                                      verification_code=verification_code,
                                                      phone_number=phone_to_send_text,
                                                      )

    aws_send_verification_text(pvs.phone_number, verification_code)
    user.phone_verification_request = pvs
    if user.phone_number is None:
        user.phone_number = pvs.phone_number
    user.save()
    pvs.save()
    return pvs


def send_verification_email(user, new_email=None):
    if new_email is not None:
        address_to_send_email = new_email
    elif user.email_verification_request is not None:
        address_to_send_email = user.email_verification_request.email
    elif user.email is not None:
        address_to_send_email = user.email
    else:
        raise Exception('No email address found to send email to.')

    qs = EmailVerificationSession.objects.all().filter(email=address_to_send_email)
    if qs.count() > 0 and qs.first().user != user:
        raise Exception("Email address already exists under a different user!")
    verification_code = str(uuid.uuid4())

    if qs.count() > 0 and qs.first().user == user:

        evs = qs.first()
        if evs.status == EmailVerifStatusChoices.ACCEPTED and evs.email == address_to_send_email:
            return evs
        evs.status = EmailVerifStatusChoices.PENDING
        evs.email = address_to_send_email
        evs.verification_code = verification_code
        evs.save()
    else:
        evs = EmailVerificationSession.objects.create(user=user,
                                                      verification_code=verification_code,
                                                      email=address_to_send_email,
                                                      )
    # TODO Why id???? and not verification code???
    url = settings.FRONTEND_DOMAIN + 'email-verification/' + str(evs.id)
    # The email body for recipients with non-HTML email clients.
    BODY_TEXT = ("<p>Welcome to PAI Pass!</p>"
                 "<p>You're receiving this email because someone added this email address to their PAI Pass account."
                 " If you didn't add this email address to your PAI Pass account, please ignore this email and "
                 "don't click on the links below.</p>"
                 f"<p>To confirm your email address, please <a href=\"{url}\">click here</a>, or paste the following URL into your address "
                 "bar:</p>"

                 f"<p>{url}</p>"

                 "<p>This verification link is valid for four hours. If the link has expired, please log into your"
                 f" account at {settings.FRONTEND_DOMAIN} and select 'Profile' in the menu to update or resend a "
                 "confirmation link for your email address.</p>"

                 "<p>Thank you,</p>"
                 "<p>The PAI Pass Team</p>"

                 )

    # The HTML body of the email.
    BODY_HTML = """
                """

    # The character encoding for the email.
    CHARSET = "UTF-8"

    # Create a new SES resource and specify a region.
    client = settings.AWS_API.client('ses', region_name='us-east-1')

    # Provide the contents of the email.
    response = client.send_email(
        Destination={
            'ToAddresses': [
                evs.email,
            ],
        },
        Message={
            'Body': {
                'Html': {
                    'Charset': CHARSET,
                    'Data': BODY_TEXT,
                },
                'Text': {
                    'Charset': CHARSET,
                    'Data': BODY_TEXT,
                },
            },
            'Subject': {
                'Charset': CHARSET,
                'Data': 'Please follow the email verification process',
            },
        },
        Source=settings.ACCOUNTS_EMAIL,
    )

    user.email_verification_request = evs
    if user.email is None:
        user.email = evs.email
    user.save()
    evs.save()
    return evs


def send_password_reset_email(email, language):
    user = PaipassUser.objects.all().get(email=email)
    # Todo why do the other functions in here have checks for previously existing sessions
    verification_code = str(uuid.uuid4())
    sfa_verification_code = get_phone_verification_code()
    second_factor_auth_sess = SecondFactorAuthSession.objects.create(user=user,
                                                                     encoded_code=sfa_verification_code,
                                                                     exchanged_on=epoch_start(),
                                                                     verified_on=epoch_start())
    # TODO figure out how to get IP address
    ip_address = '1.1.1.1'
    rps = ResetPasswordSession.objects.create(user=user,
                                              verification_code=verification_code,
                                              second_factor_auth_sess=second_factor_auth_sess,
                                              ip_address=ip_address)

    url = settings.BACKEND_DOMAIN + 'api/v1/account/forgot-password/' + str(rps.verification_code)

    TITLE_TEXT = get_title_forgot_password(language)
    BODY_TEXT = get_body_forgot_password(language, url)

    # The HTML body of the email.
    BODY_HTML = """
                """

    # The character encoding for the email.
    CHARSET = "UTF-8"

    # Create a new SES resource and specify a region.
    client = settings.AWS_API.client('ses', region_name='us-east-1')

    # Provide the contents of the email.
    response = client.send_email(
        Destination={
            'ToAddresses': [
                rps.user.email,
            ],
        },
        Message={
            'Body': {
                'Html': {
                    'Charset': CHARSET,
                    'Data': BODY_TEXT,
                },
                'Text': {
                    'Charset': CHARSET,
                    'Data': BODY_TEXT,
                },
            },
            'Subject': {
                'Charset': CHARSET,
                'Data': TITLE_TEXT,
            },
        },
        Source=settings.ACCOUNTS_EMAIL,
    )
    second_factor_auth_sess.save()
    rps.save()
    return rps


FORGOT_PASSWORD_TITLE_ENGLISH = 'PAI Pass Password Recovery'

FORGOT_PASSWORD_TITLE_CHINESE = 'PAI Pass 重置密码要求'


def get_body_forgot_password(language, url):
    FORGOT_PASSWORD_BODY_ENGLISH = ("<p>Hello,</p>"
                                    "<p> You're receiving this email because someone tried to recover a forgotten PAI Pass password for "
                                    "your account. If you did not request a password reset, please ignore this email and don't click "
                                    "on the links below. </p>"
                                    f"<p> To reset your password, please <a href=\"{url}\">click here</a>, or paste the following URL into your address bar: </p>"

                                    f"<p>{url}</p>"

                                    "<p>Thank you,</p>"
                                    "<p>The PAI Pass Team</p>"

                                    )

    FORGOT_PASSWORD_BODY_CHINESE = ("<p>你好,</p>"
                                    "<p> 您收到此电子邮件是因为有人试图找回您帐户中被遗忘的PAI Pass密码。 如果您不要求重设密码，请忽略此电子邮件，不要单击下面的链接。</p>"
                                    f"<p> 要重置密码， <a href=\"{url}\">请单击此处</a>, 或将以下URL粘贴到地址栏中：</p>"

                                    f"<p>{url}</p>"

                                    "<p>谢谢，</p>"
                                    "<p>PAI Pass团队</p>"

                                    )
    if language == '中文':
        return FORGOT_PASSWORD_BODY_CHINESE
    return FORGOT_PASSWORD_BODY_ENGLISH


def get_title_forgot_password(language):
    if language == '中文':
        return FORGOT_PASSWORD_TITLE_CHINESE
    return FORGOT_PASSWORD_TITLE_ENGLISH


def send_forgot_password_verification_code(password_reset_session):
    sfa_session = password_reset_session.second_factor_auth_sess
    verif_code = sfa_session.encoded_code
    sfa_session.exchanged_on = timezone.now()
    aws_send_verification_text(password_reset_session.user.phone_number, verif_code)
    sfa_session.save()

