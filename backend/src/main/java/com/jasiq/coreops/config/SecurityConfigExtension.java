package com.jasiq.coreops.config;

import com.jasiq.coreops.auth.User;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfigExtension {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .addFilterBefore(new JwtTokenFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(authz -> authz
                // Employee routes - only EMPLOYEE role
                .requestMatchers("/api/v1/employees/me").hasAuthority("EMPLOYEE")
                .requestMatchers("/api/v1/attendance/me").hasAuthority("EMPLOYEE")
                .requestMatchers("/api/v1/attendance/me").hasAuthority("EMPLOYEE")
                .requestMatchers("/api/v1/timesheets/me").hasAuthority("EMPLOYEE")
                .requestMatchers("/api/v1/leave/me").hasAuthority("EMPLOYEE")
                .requestMatchers("/api/v1/leave/balance/me").hasAuthority("EMPLOYEE")
                
                // Password setup - public
                .requestMatchers("/api/v1/auth/set-password").permitAll()
                
                // Block employees from admin routes
                .requestMatchers("/admin/**").denyAll()
                .requestMatchers("/governance/**").denyAll()
                .requestMatchers("/finance/**").denyAll()
                .requestMatchers("/payroll/**").denyAll()
                
                // Other routes - existing rules
                .anyRequest().authenticated()
            );
        
        return http.build();
    }
    
    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler() {
        DefaultMethodSecurityExpressionHandler handler = new DefaultMethodSecurityExpressionHandler();
        return handler;
    }
}
