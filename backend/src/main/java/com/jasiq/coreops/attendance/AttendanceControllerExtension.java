package com.jasiq.coreops.attendance;

import com.jasiq.coreops.auth.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceControllerExtension {
    
    @Autowired
    private AttendanceRepository attendanceRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    /**
     * Self-scoped endpoint: Get current employee's attendance
     */
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> getMyAttendance(Pageable pageable) {
        UUID employeeId = getCurrentEmployeeId();
        
        Page<Attendance> attendance = attendanceRepository.findByEmployeeIdOrderByDateDesc(employeeId, pageable);
        
        return ResponseEntity.ok(attendance);
    }
    
    /**
     * Self-scoped endpoint: Mark today's attendance
     */
    @PostMapping("/me")
    @PreAuthorize("hasAuthority('EMPLOYEE')")
    public ResponseEntity<?> markMyAttendance(@RequestBody MarkAttendanceRequest request) {
        UUID employeeId = getCurrentEmployeeId();
        
        // Check if already marked for today
        LocalDate today = LocalDate.now();
        if (attendanceRepository.existsByEmployeeIdAndDate(employeeId, today)) {
            return ResponseEntity.badRequest().body("Attendance already marked for today");
        }
        
        Attendance attendance = new Attendance();
        attendance.setEmployeeId(employeeId);
        attendance.setDate(today);
        attendance.setStatus(request.getStatus());
        attendance.setCheckIn(request.getCheckIn());
        attendance.setCheckOut(request.getCheckOut());
        
        attendance = attendanceRepository.save(attendance);
        
        return ResponseEntity.ok(attendance);
    }
    
    private UUID getCurrentEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        return user.getEmployeeId();
    }
    
    public static class MarkAttendanceRequest {
        private String status;
        private String checkIn;
        private String checkOut;
        
        // Getters and Setters
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        
        public String getCheckIn() { return checkIn; }
        public void setCheckIn(String checkIn) { this.checkIn = checkIn; }
        
        public String getCheckOut() { return checkOut; }
        public void setCheckOut(String checkOut) { this.checkOut = checkOut; }
    }
}
