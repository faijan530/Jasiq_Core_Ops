// Simple script to add ATTENDANCE_VIEW_TEAM permission to MANAGER role
fetch('http://localhost:49670/api/v1/temp/add-manager-attendance-permission', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Response:', data);
  if (data.success) {
    console.log('✅ Permission added successfully!');
    console.log('Verification:', data.verification);
  } else {
    console.error('❌ Failed to add permission:', data.error);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
  console.log('Make sure the backend is running on port 49670');
});
