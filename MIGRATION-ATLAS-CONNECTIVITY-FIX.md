# Migration Atlas Connectivity Fix

## Problem
When the computer was restarted with WiFi off, the local feedTypes collection (and potentially other collections) were being overwritten or removed because the migration scripts were running on startup and dropping local collections before testing Atlas connectivity.

## Root Cause
The migration scripts (`migrateFeedTypes.js`, `migrateOrgs.js`, `migrateUsers.js`) were dropping local collections immediately after checking if they existed, before testing whether Atlas was actually reachable. This meant:

1. Script checks if local collection exists
2. Script drops the local collection
3. Script tries to connect to Atlas
4. If Atlas is not available (WiFi off), the script fails
5. Local data is lost with no way to recover it

## Solution
Modified the migration scripts to test Atlas connectivity **before** dropping any local collections. The new flow is:

1. Check if local collection exists and count documents
2. Test Atlas connectivity and fetch data
3. Only if Atlas is connected AND data is available, then drop local collection
4. Import new data from Atlas
5. If Atlas is not available, preserve existing local data

## Files Modified

### 1. `backend/scripts/migrateFeedTypes.js`
- Added `existingCount` tracking
- Moved Atlas connectivity test before collection drop
- Added data preservation logic when Atlas is unavailable
- Added detailed logging for debugging

### 2. `backend/scripts/migrateOrgs.js`
- Added `existingCount` tracking
- Moved Atlas connectivity test before collection drop
- Added data preservation logic when Atlas is unavailable
- Added detailed logging for debugging

### 3. `backend/scripts/migrateUsers.js`
- Added `existingCount` tracking
- Moved Atlas connectivity test before collection drop
- Added data preservation logic when Atlas is unavailable
- Added detailed logging for debugging

## Key Changes Made

### Before (Problematic):
```javascript
// Check if collection exists
if (existingCollection) {
    await db.collection('localFeedTypes').drop(); // Drops immediately!
}

// Try to connect to Atlas (may fail)
try {
    atlasClient = new MongoClient(atlasUri);
    await atlasClient.connect();
    // ... fetch data
} catch (error) {
    // Too late! Collection already dropped
}
```

### After (Fixed):
```javascript
// Check if collection exists and count documents
let existingCount = 0;
if (existingCollection) {
    existingCount = await db.collection('localFeedTypes').countDocuments();
}

// Test Atlas connectivity BEFORE dropping anything
let atlasConnected = false;
let matchingData = [];
try {
    atlasClient = new MongoClient(atlasUri);
    await atlasClient.connect();
    atlasConnected = true;
    matchingData = await fetchDataFromAtlas();
} catch (error) {
    console.log('Atlas not available, preserving existing data');
    if (existingCount > 0) {
        return; // Preserve existing data
    }
}

// Only drop collection if Atlas is connected AND we have data
if (atlasConnected && matchingData.length > 0) {
    await db.collection('localFeedTypes').drop();
    await db.collection('localFeedTypes').insertMany(matchingData);
}
```

## Testing
Created `backend/test-migration-atlas-connectivity.js` to verify the fix works correctly.

## Benefits
1. **Data Preservation**: Local data is never lost when Atlas is unavailable
2. **Graceful Degradation**: System continues to work offline with existing data
3. **Better Logging**: Clear indication of what's happening during migration
4. **Robust Error Handling**: Proper fallback behavior in all scenarios

## Migration Behavior Summary

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Atlas available, data exists | Drop local, import Atlas | Drop local, import Atlas |
| Atlas available, no data | Drop local, leave empty | Preserve local data |
| Atlas unavailable, local data exists | Drop local, fail | Preserve local data |
| Atlas unavailable, no local data | Drop local, fail | Create default data if needed |

## Files That Were Already Safe
- `migrateCarts.js` - Only migrates if no carts exist
- `migrateLabels.js` - Uses upsert, doesn't drop collections
- `migrateDeviceLabels.js` - Preserves existing data in offline mode 