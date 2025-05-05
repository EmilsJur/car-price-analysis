import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Divider, 
  useTheme,
  Paper,
  Grid
} from '@mui/material';
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
        <Grid container spacing={2} sx={{ py: 3 }}>
          {/* Logo and copyright */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <DirectionsCarIcon sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Auto Tirgus Analīze
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Auto Tirgus Analīze. Izstrādāts kā kvalifikācijas darbs Rīgas Valsts tehnikumā.
            </Typography>
          </Grid>
          
          {/* Contact */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Kontakti
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  E-pasts: info@autoanalytics.lv
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Tālrunis: +371 12345678
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Rīga, Latvija
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Divider />
        
        <Box sx={{ py: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Link href="/privacy" color="inherit" underline="hover">
            <Typography variant="body2" color="text.secondary">
              Privātuma Politika
            </Typography>
          </Link>
          <Link href="/terms" color="inherit" underline="hover">
            <Typography variant="body2" color="text.secondary">
              Lietošanas Noteikumi
            </Typography>
          </Link>
          <Link href="/sitemap" color="inherit" underline="hover">
            <Typography variant="body2" color="text.secondary">
              Vietnes Karte
            </Typography>
          </Link>
        </Box>
      </Container>
    </Paper>
  );
};

export default Footer;