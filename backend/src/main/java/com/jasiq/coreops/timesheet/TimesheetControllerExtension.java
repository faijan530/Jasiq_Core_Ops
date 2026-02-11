package com.jasiq.coreops.timesheet;

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
@RequestMapping("/api/v1/timesheets")
public class TimesheetControllerExtension {
    
    @Autowired
    private TimesheetRepository timesheetRepository;
    
    /**
     * Self-scoped endpoint: Get current employee's timesheets
     */
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> getMyTimesheets(Pageable pageable) {
        UUID employeeId = getCurrentEmployeeId();
        
        Page<Timesheet> timesheets = timesheetRepository.findByEmployeeIdOrderByWeekStartDesc(employeeId, pageable);
        
        return ResponseEntity.ok(timesheets);
    }
    
    /**
     * Self-scoped endpoint: Submit timesheet
     */
    @PostMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> submitMyTimesheet(@RequestBody TimesheetRequest request) {
        UUID employeeId = getCurrentEmployeeId();
        
        Timesheet timesheet = new Timesheet();
        timesheet.setEmployeeId(employeeId);
        timesheet.setWeekStart(request.getWeekStart());
        timesheet.setEntries(request.getEntries());
        timesheet.setStatus("SUBMITTED");
        timesheet.setTotalHours(calculateTotalHours(request.getEntries()));
        
        timesheet = timesheetRepository.save(timesheet);
        
        return ResponseEntity.ok(timesheet);
    }
    
    private UUID getCurrentEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        return user.getEmployeeId();
    }
    
    private double calculateTotalHours(Object entries) {
        // Calculate total hours from entries
        return 0.0; // Implementation depends on entry structure
    }
    
    public static class TimesheetRequest {
        private String weekStart;
        private Object entries;
        
        // Getters and Setters
        public String getWeekStart() { return weekStart; }
        public void setWeekStart(String weekStart) { this.weekStart = weekStart; }
        
        public Object getEntries() { return entries; }
        public void setEntries(Object entries) { this.entries = entries; }
    }
}
