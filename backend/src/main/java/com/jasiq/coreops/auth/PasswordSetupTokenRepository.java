package com.jasiq.coreops.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordSetupTokenRepository extends JpaRepository<PasswordSetupToken, UUID> {
    
    Optional<PasswordSetupToken> findByToken(String token);
    
    Optional<PasswordSetupToken> findByUserIdAndUsedFalse(UUID userId);
    
    @Query("SELECT pst FROM PasswordSetupToken pst WHERE pst.token = :token AND pst.used = false AND pst.expiresAt > :now")
    Optional<PasswordSetupToken> findValidToken(@Param("token") String token, @Param("now") Instant now);
    
    void deleteByExpiresAtBefore(Instant now);
}
