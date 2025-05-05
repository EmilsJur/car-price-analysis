import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Grid, 
  Divider, 
  IconButton, 
  useTheme,
  Paper
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  
  return (
    <Paper 
      component="footer" 
      square 
      variant="outlined" 
      sx={{ 
        mt: 'auto',
        backgroundColor: theme.palette.mode === 'light' 
          ? theme.palette.grey[100] 
          : theme.palette.grey[900]
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ py: 4 }}>
          {/* About section */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DirectionsCarIcon sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Car Market Analysis
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              A comprehensive tool for analyzing car prices across different marketplaces, 
              helping users make informed decisions when buying or selling vehicles.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <IconButton color="primary" aria-label="facebook">
                <FacebookIcon />
              </IconButton>
              <IconButton color="primary" aria-label="twitter">
                <TwitterIcon />
              </IconButton>
              <IconButton color="primary" aria-label="linkedin">
                <LinkedInIcon />
              </IconButton>
              <IconButton color="primary" aria-label="github">
                <GitHubIcon />
              </IconButton>
            </Box>
          </Grid>
          
          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Quick Links
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/" color="inherit" underline="hover">
                  Home
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/search" color="inherit" underline="hover">
                  Advanced Search
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/analysis" color="inherit" underline="hover">
                  Market Analysis
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/compare" color="inherit" underline="hover">
                  Compare Vehicles
                </Link>
              </Box>
            </Box>
          </Grid>
          
          {/* Resources */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Resources
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/help" color="inherit" underline="hover">
                  Help Center
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/faq" color="inherit" underline="hover">
                  FAQ
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/blog" color="inherit" underline="hover">
                  Blog
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="/api-docs" color="inherit" underline="hover">
                  API Documentation
                </Link>
              </Box>
            </Box>
          </Grid>
          
          {/* Contact */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Contact
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Email: info@carmarketanalysis.com
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Phone: +371 12345678
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Riga, Latvia
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Divider />
        
        <Box sx={{ py: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            © {currentYear} Car Market Analysis. Built as part of the qualification work at Riga State Technical School.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, sm: 0 } }}>
            <Link href="/privacy" color="inherit" underline="hover">
              <Typography variant="body2" color="text.secondary">
                Privacy Policy
              </Typography>
            </Link>
            <Link href="/terms" color="inherit" underline="hover">
              <Typography variant="body2" color="text.secondary">
                Terms of Service
              </Typography>
            </Link>
            <Link href="/sitemap" color="inherit" underline="hover">
              <Typography variant="body2" color="text.secondary">
                Sitemap
              </Typography>
            </Link>
          </Box>
        </Box>
      </Container>
    </Paper>
  );
};

export default Footer;