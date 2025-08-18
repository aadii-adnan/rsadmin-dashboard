from django.db import models

class ContactMessage(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.CharField(max_length=50, default="rsexpressparking", help_text="Source website for this contact message")  # <-- Add this field
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.last_name} - {self.timestamp}"
    
    class Meta:
        db_table = 'contactmessages'
