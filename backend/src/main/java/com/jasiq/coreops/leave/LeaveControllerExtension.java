package com.jasiq.coreops.leave;

import com.jasiq.coreops.auth.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leave")
public class LeaveControllerExtension {
    
    @Autowired
    private LeaveRequestRepository leaveRequestRepository;
    
    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;
    
    /**
     * Self-scoped endpoint: Get current employee's leave requests
     */
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> getMyLeaveRequests(Pageable pageable) {
        UUID employeeId = getCurrentEmployeeId();
        
        Page<LeaveRequest> leaveRequests = leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId, pageable);
        
        return ResponseEntity.ok(leaveRequests);
    }
    
    /**
     * Self-scoped endpoint: Get current employee's leave balance
     */
    @GetMapping("/balance/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> getMyLeaveBalance() {
        UUID employeeId = getCurrentEmployeeId();
        
        LeaveBalance leaveBalance = leaveBalanceRepository.findByEmployeeId(employeeId)
            .orElse(new LeaveBalance());
        
        return ResponseEntity.ok(leaveBalance);
    }
    
    /**
     * Self-scoped endpoint: Apply for leave
     */
    @PostMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> applyForLeave(@RequestBody LeaveRequest request) {
        UUID employeeId = getCurrentEmployeeId();
        
        request.setEmployeeId(employeeId);
        request.setStatus("PENDING");
        
        request = leaveRequestRepository.save(request);
        
        return ResponseEntity.ok(request);
    }
    
    private UUID getCurrentEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        return user.getEmployeeId();
    }
}
