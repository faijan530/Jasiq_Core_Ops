package com.jasiq.coreops.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
public class PasswordSetupService {
    
    @Autowired
    private PasswordSetupTokenRepository tokenRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    private static final int TOKEN_LENGTH = 32;
    private static final int TOKEN_EXPIRY_HOURS = 48;
    
    @Transactional
    public PasswordSetupToken createPasswordSetupToken(UUID userId, String employeeName, String employeeEmail) {
        // Generate secure random token
        String token = generateSecureToken();
        
        // Create token with 48-hour expiry
        Instant expiresAt = Instant.now().plus(TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS);
        PasswordSetupToken setupToken = new PasswordSetupToken(userId, token, expiresAt);
        
        // Save token
        setupToken = tokenRepository.save(setupToken);
        
        // Send email (non-blocking, don't fail if email fails)
        try {
            sendPasswordSetupEmail(employeeName, employeeEmail, token);
        } catch (Exception e) {
            // Log error but don't fail the token creation
            System.err.println("Failed to send password setup email to " + employeeEmail + ": " + e.getMessage());
        }
        
        return setupToken;
    }
    
    @Transactional
    public boolean setPassword(String token, String password) {
        PasswordSetupToken setupToken = tokenRepository.findValidToken(token, Instant.now())
            .orElse(null);
        
        if (setupToken == null) {
            return false;
        }
        
        // Get user and update password
        User user = userRepository.findById(setupToken.getUserId())
            .orElse(null);
        
        if (user == null) {
            return false;
        }
        
        // Encode and set password
        user.setPassword(passwordEncoder.encode(password));
        user.setActive(true);
        userRepository.save(user);
        
        // Mark token as used
        setupToken.setUsed(true);
        tokenRepository.save(setupToken);
        
        return true;
    }
    
    private String generateSecureToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[TOKEN_LENGTH];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().toString(bytes);
    }
    
    private void sendPasswordSetupEmail(String employeeName, String employeeEmail, String token) {
        String subject = "Set up your JASIQ CoreOps account";
        
        String body = String.format(
            "Hello %s,\n\n" +
            "Your employee account has been created.\n\n" +
            "Please set your password using the link below:\n" +
            "https://<frontend-host>/set-password?token=%s\n\n" +
            "This link expires in 48 hours.\n\n" +
            "– JASIQ Labs",
            employeeName, token
        );
        
        emailService.sendEmail(employeeEmail, subject, body);
    }
    
    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    
    @Autowired
    private EmailService emailService;
}
