package com.jasiq.coreops.config;

import com.jasiq.coreops.auth.PasswordSetupTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class ScheduledTasks {
    
    @Autowired
    private PasswordSetupTokenRepository passwordSetupTokenRepository;
    
    /**
     * Clean up expired password setup tokens
     * Runs every hour
     */
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    @Transactional
    public void cleanupExpiredTokens() {
        Instant now = Instant.now();
        passwordSetupTokenRepository.deleteByExpiresAtBefore(now);
    }
}
