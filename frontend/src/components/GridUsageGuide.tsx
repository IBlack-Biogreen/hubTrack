import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

/**
 * GridUsageGuide Component
 * 
 * This component serves as documentation for how the Grid component is used throughout
 * the HubTrack application, with examples that match existing usage patterns.
 */
const GridUsageGuide: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Grid Component Usage Guide
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Basic Grid Layout
        </Typography>
        <Typography paragraph>
          The Grid component from MUI is used to create responsive layouts. In HubTrack, 
          we typically use the Grid with xs, sm, and md breakpoints.
        </Typography>
        
        <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Example:
          </Typography>
          <code>
            {`
<Grid container spacing={2}>
  <Grid xs={12} sm={6} md={4}>
    <Paper>Item 1</Paper>
  </Grid>
  <Grid xs={12} sm={6} md={4}>
    <Paper>Item 2</Paper>
  </Grid>
  <Grid xs={12} sm={6} md={4}>
    <Paper>Item 3</Paper>
  </Grid>
</Grid>
            `}
          </code>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Organization Selection Grid
        </Typography>
        <Typography paragraph>
          Used in TrackingSequence.tsx for displaying organizations in a responsive grid.
        </Typography>
        
        <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Implementation:
          </Typography>
          <code>
            {`
<Grid container spacing={2}>
  {organizations.map((org) => (
    <Grid xs={12} sm={6} md={4} key={org.name}>
      <Card>
        <CardActionArea onClick={() => handleSelectOrganization(org)}>
          <CardContent>
            <Typography variant="h6">{org.displayName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {org.name}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  ))}
</Grid>
            `}
          </code>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Department Selection Grid
        </Typography>
        <Typography paragraph>
          Used in TrackingSequence.tsx for displaying departments in a responsive grid.
        </Typography>
        
        <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Implementation:
          </Typography>
          <code>
            {`
<Grid container spacing={2}>
  {departments.map((dept) => (
    <Grid xs={12} sm={6} md={4} key={dept.name}>
      <Card>
        <CardActionArea onClick={() => handleSelectDepartment(dept)}>
          <CardContent>
            <Typography variant="h6">{dept.displayName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {dept.name}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  ))}
</Grid>
            `}
          </code>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Feed Type Selection Grid
        </Typography>
        <Typography paragraph>
          Used in TrackingSequence.tsx for displaying feed types in a responsive grid with colored backgrounds.
        </Typography>
        
        <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Implementation:
          </Typography>
          <code>
            {`
<Grid container spacing={2}>
  {feedTypes.map((feedType) => (
    <Grid xs={12} sm={6} md={4} key={feedType.id}>
      <Card sx={{ 
        bgcolor: \`#\${feedType.buttonColor}\`, 
        color: isLightColor(feedType.buttonColor) ? '#000' : '#fff' 
      }}>
        <CardActionArea onClick={() => handleSelectFeedType(feedType)}>
          <CardContent>
            <Typography variant="h6">{feedType.displayName}</Typography>
            <Typography variant="body2">
              {feedType.explanation}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  ))}
</Grid>
            `}
          </code>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Confirmation Screen Layout
        </Typography>
        <Typography paragraph>
          Used in TrackingSequence.tsx for the confirmation step to display feed details and image preview side by side.
        </Typography>
        
        <Box sx={{ border: '1px solid #eee', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Implementation:
          </Typography>
          <code>
            {`
<Grid container spacing={3}>
  {/* Feed details */}
  <Grid xs={12} md={6}>
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        Feed Details
      </Typography>
      <Box sx={{ my: 2 }}>
        {/* Feed details content */}
      </Box>
    </Paper>
  </Grid>
  
  {/* Image preview */}
  <Grid xs={12} md={6}>
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        Image Preview
      </Typography>
      {/* Image preview content */}
    </Paper>
  </Grid>
</Grid>
            `}
          </code>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Best Practices
        </Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Always use the container prop on the parent Grid component</li>
            <li>Always include spacing prop on Grid container to manage gutters</li>
            <li>For most card layouts, use xs=12, sm=6, md=4 for a 3-column layout on desktop</li>
            <li>For side-by-side layouts, use xs=12, md=6 to stack on mobile and show side-by-side on desktop</li>
            <li>Match the height of Grid items when placed side by side using height: '100%'</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
};

export default GridUsageGuide; 