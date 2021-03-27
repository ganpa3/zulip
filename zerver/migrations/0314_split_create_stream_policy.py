from django.db import migrations, models
from django.db.backends.postgresql.schema import DatabaseSchemaEditor
from django.db.migrations.state import StateApps
from django.db.models import F


def copy_stream_policy_field(apps: StateApps, schema_editor: DatabaseSchemaEditor) -> None:
    Realm = apps.get_model("zerver", "Realm")
    Realm.objects.all().update(create_public_stream_policy=F("create_stream_policy"))
    Realm.objects.all().update(create_private_stream_policy=F("create_stream_policy"))


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("zerver", "0313_finish_is_user_active_migration"),
    ]

    operations = [
        migrations.AddField(
            model_name="realm",
            name="create_private_stream_policy",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="realm",
            name="create_public_stream_policy",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.RunPython(
            copy_stream_policy_field, reverse_code=migrations.RunPython.noop, elidable=True
        ),
        migrations.RemoveField(
            model_name="realm",
            name="create_stream_policy",
        ),
    ]
