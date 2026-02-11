package com.jasiq.coreops.employee;

import com.jasiq.coreops.auth.PasswordSetupService;
import com.jasiq.coreops.auth.User;
import com.jasiq.coreops.auth.UserRepository;
import com.jasiq.coreops.auth.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class EmployeeServiceExtension {
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordSetupService passwordSetupService;
    
    @Autowired
    private RoleRepository roleRepository;
    
    /**
     * Extension method to create user account after employee creation
     * This should be called AFTER employee is saved
     */
    @Transactional
    public void createEmployeeUserAccount(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeId));
        
        // Check if user already exists
        if (userRepository.findByEmail(employee.getEmail()).isPresent()) {
            return; // User already exists, skip
        }
        
        // Get EMPLOYEE role
        Role employeeRole = roleRepository.findByName("EMPLOYEE")
            .orElseThrow(() -> new RuntimeException("EMPLOYEE role not found"));
        
        // Create inactive user account
        User user = new User();
        user.setEmail(employee.getEmail());
        user.setRole(employeeRole);
        user.setActive(false); // Inactive until password is set
        user.setEmployeeId(employeeId);
        user.setPassword(null); // No password yet
        
        user = userRepository.save(user);
        
        // Create password setup token and send email
        String employeeName = (employee.getFirstName() + " " + employee.getLastName()).trim();
        passwordSetupService.createPasswordSetupToken(user.getId(), employeeName, employee.getEmail());
    }
}
