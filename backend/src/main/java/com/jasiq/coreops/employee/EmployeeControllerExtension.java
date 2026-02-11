package com.jasiq.coreops.employee;

import com.jasiq.coreops.auth.PasswordSetupService;
import com.jasiq.coreops.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeControllerExtension {
    
    @Autowired
    private EmployeeServiceExtension employeeServiceExtension;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    /**
     * Override or extend existing employee creation to trigger user account creation
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('EMPLOYEE_WRITE', 'ADMIN')")
    public ResponseEntity<?> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        // First, create the employee using existing logic
        Employee employee = new Employee();
        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setEmail(request.getEmail());
        employee.setPhone(request.getPhone());
        employee.setDesignation(request.getDesignation());
        employee.setReportingManager(request.getReportingManager());
        employee.setScope(request.getScope());
        employee.setPrimaryDivisionId(request.getPrimaryDivisionId());
        employee.setStatus(request.getStatus());
        
        employee = employeeRepository.save(employee);
        
        // Then create the user account for employee login
        try {
            employeeServiceExtension.createEmployeeUserAccount(employee.getId());
        } catch (Exception e) {
            // Log error but don't fail employee creation
            System.err.println("Failed to create user account for employee " + employee.getId() + ": " + e.getMessage());
        }
        
        return ResponseEntity.ok(employee);
    }
    
    /**
     * Self-scoped endpoint for employees to get their own data
     */
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> getMyEmployeeData() {
        // Get employee ID from security context (JWT)
        UUID employeeId = getCurrentEmployeeId();
        
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));
        
        return ResponseEntity.ok(employee);
    }
    
    private UUID getCurrentEmployeeId() {
        // This should be extracted from JWT token in security context
        // Implementation depends on your JWT setup
        return UUID.fromString("current-employee-id-from-jwt"); // Placeholder
    }
    
    public static class CreateEmployeeRequest {
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String designation;
        private String reportingManager;
        private String scope;
        private UUID primaryDivisionId;
        private String status;
        
        // Getters and Setters
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        
        public String getDesignation() { return designation; }
        public void setDesignation(String designation) { this.designation = designation; }
        
        public String getReportingManager() { return reportingManager; }
        public void setReportingManager(String reportingManager) { this.reportingManager = reportingManager; }
        
        public String getScope() { return scope; }
        public void setScope(String scope) { this.scope = scope; }
        
        public UUID getPrimaryDivisionId() { return primaryDivisionId; }
        public void setPrimaryDivisionId(UUID primaryDivisionId) { this.primaryDivisionId = primaryDivisionId; }
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
