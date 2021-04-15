# Generated by Django 3.0.1 on 2020-05-21 10:15

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import oauth2_provider.generators
import uuid


class Migration(migrations.Migration):
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]
    run_before = [
        ('oauth2_provider', '0001_initial'),
    ]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('attributes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaipassAccessToken',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('token', models.CharField(max_length=255, unique=True)),
                ('expires', models.DateTimeField()),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PaipassApplication',
            fields=[
                ('client_id', models.CharField(db_index=True, default=oauth2_provider.generators.generate_client_id, max_length=100, unique=True)),
                ('redirect_uris', models.TextField(blank=True, help_text='Allowed URIs list, space separated')),
                ('client_type', models.CharField(choices=[('confidential', 'Confidential'), ('public', 'Public')], max_length=32)),
                ('authorization_grant_type', models.CharField(choices=[('authorization-code', 'Authorization code'), ('implicit', 'Implicit'), ('password', 'Resource owner password-based'), ('client-credentials', 'Client credentials')], max_length=32)),
                ('client_secret', models.CharField(blank=True, db_index=True, default=oauth2_provider.generators.generate_client_secret, max_length=255)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('skip_authorization', models.BooleanField(default=False)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('logo_url', models.CharField(max_length=1024, verbose_name='logo url')),
                ('home_page_url', models.CharField(max_length=1024, verbose_name='home page url')),
                ('namespace', models.CharField(max_length=128, unique=True, validators=[django.core.validators.RegexValidator(code='nomatch', message='Length must be between 4-32 characters', regex='^.{4,32}$')], verbose_name='namespace')),
                ('description', models.TextField(max_length=1024, verbose_name='description')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='oauth2_paipassapplication', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PaipassRefreshToken',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('token', models.CharField(max_length=255)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('revoked', models.DateTimeField(null=True)),
                ('access_token', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='refresh_token', to=settings.OAUTH2_PROVIDER_ACCESS_TOKEN_MODEL)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.OAUTH2_PROVIDER_APPLICATION_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='oauth2_paipassrefreshtoken', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
                'unique_together': {('token', 'revoked')},
            },
        ),
        migrations.CreateModel(
            name='PaipassGrant',
            fields=[
                ('scope', models.TextField(blank=True)),
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=255, unique=True)),
                ('expires', models.DateTimeField()),
                ('redirect_uri', models.CharField(max_length=255)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.OAUTH2_PROVIDER_APPLICATION_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='oauth2_paipassgrant', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='paipassaccesstoken',
            name='application',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.OAUTH2_PROVIDER_APPLICATION_MODEL),
        ),
        migrations.AddField(
            model_name='paipassaccesstoken',
            name='source_refresh_token',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='refreshed_access_token', to=settings.OAUTH2_PROVIDER_REFRESH_TOKEN_MODEL),
        ),
        migrations.AddField(
            model_name='paipassaccesstoken',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='oauth2_paipassaccesstoken', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='AccessTokenScopes',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('APPROVED', 'APPROVED'), ('DENIED', 'DENIED')], default='DENIED', max_length=32, verbose_name='status')),
                ('max_perms', models.SmallIntegerField(choices=[(0, 'None'), (1, 'Read'), (3, 'Read Write')], default=0, verbose_name='Max Non-Owner Permissions')),
                ('access_token', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.OAUTH2_PROVIDER_ACCESS_TOKEN_MODEL)),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='attributes.Attribute')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='oauth2_accesstokenscopes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('access_token', 'attribute')},
            },
        ),
    ]