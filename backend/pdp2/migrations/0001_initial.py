# Generated by Django 3.0.1 on 2020-05-21 10:15

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import pdp2.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Pdp2ProfileSubscription',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pub_key_addr', models.CharField(default=pdp2.models.generate_pub_key_addr, max_length=34)),
                ('is_monitoring_block_height', models.BooleanField(default=False)),
                ('txid', models.CharField(max_length=64)),
                ('amount_paid', models.BigIntegerField(default=0)),
                ('amount_requested', models.BigIntegerField(default=2147483647)),
                ('discount', models.BigIntegerField(default=0, verbose_name='discount')),
                ('subscription_start_date', models.DateTimeField(default=pdp2.models.long_time_from_now)),
                ('subscription_length', models.IntegerField(default=-1)),
                ('user_deactivated', models.BooleanField(default=False)),
                ('staff_deactivated', models.BooleanField(default=False)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pdp2_user', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Pdp2Transaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('torrent_file_uuid', models.CharField(default='99999999-9999-9999-9999-999999999999', max_length=36)),
                ('torrent_info_hash', models.CharField(default='NEW_INFO_HASH', max_length=64)),
                ('torrent_file_date_created', models.DateTimeField()),
                ('pdp2_op_return_txid', models.CharField(default='00000000000000000000000000000000', max_length=64)),
                ('pdp2_op_return_ref', models.CharField(blank=True, default='00000000000000', max_length=14, null=True)),
                ('pub_key_addr', models.CharField(max_length=34)),
                ('pub_key', models.CharField(blank=True, max_length=66, null=True)),
                ('is_store_op', models.BooleanField(default=False)),
                ('is_pub_key_ours', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=False)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('pdp2_subscription', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='pdp2.Pdp2ProfileSubscription')),
            ],
        ),
    ]