from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("blogs", "0004_blogpost_excerpt"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="blogpost",
            index=models.Index(
                fields=["status", "-published_date", "-created_at"],
                name="blog_status_pub_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="blogpost",
            index=models.Index(
                fields=["status", "category", "-published_date"],
                name="blog_status_cat_idx",
            ),
        ),
    ]
