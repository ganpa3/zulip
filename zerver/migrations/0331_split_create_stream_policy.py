from django.db import migrations, models
from django.db.backends.postgresql.schema import DatabaseSchemaEditor
from django.db.migrations.state import StateApps
from django.db.models import F


def copy_stream_policy_field(apps: StateApps, schema_editor: DatabaseSchemaEditor) -> None:
    Realm = apps.get_model("zerver", "Realm")
    Realm.objects.all().update(create_public_stream_policy=F("create_stream_policy"))
    Realm.objects.all().update(create_private_stream_policy=F("create_stream_policy"))


# In case we want to revert this migration, we set the create_private_stream_policy to
# be the original create_stream_policy. This does destroy information, but it's
# likely that their values will be identical.
def reverse_code(apps: StateApps, schema_editor: DatabaseSchemaEditor) -> None:
    migrations.RenameField("realm", "create_private_stream_policy", "create_stream_policy")


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("zerver", "0330_linkifier_pattern_validator"),
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
        migrations.RunPython(copy_stream_policy_field, reverse_code=reverse_code, elidable=True),
        migrations.RemoveField(
            model_name="realm",
            name="create_stream_policy",
        ),
    ]
