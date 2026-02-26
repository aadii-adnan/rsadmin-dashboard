from django.db import models

class FAQCategory(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'faqcategory'

class FAQ(models.Model):
    DYNAMIC_TYPE_CHOICES = [
        ('', 'None'),
        ('services_pricing', 'Services Pricing'),
    ]

    category = models.ForeignKey(FAQCategory, on_delete=models.CASCADE)
    question = models.CharField(max_length=255)
    answer = models.TextField(help_text="Static answer (used as fallback if dynamic is enabled)")
    is_dynamic = models.BooleanField(
        default=False,
        help_text="If checked, the answer will be generated dynamically based on dynamic type"
    )
    dynamic_type = models.CharField(
        max_length=50,
        choices=DYNAMIC_TYPE_CHOICES,
        default='',
        blank=True,
        help_text="Type of dynamic content to generate for this FAQ"
    )

    def __str__(self):
        return self.question
    
    class Meta:
        db_table = 'faq'
