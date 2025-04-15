const mongoose = require('mongoose');
require('dotenv').config();

async function checkLocalDb() {
    let localConnection = null;

    try {
        // Connect to local MongoDB
        console.log('Connecting to local MongoDB...');
        const localUri = process.env.MONGODB_LOCAL_URI;
        console.log('Local URI:', localUri);
        
        // Create the local connection
        localConnection = await mongoose.createConnection(localUri).asPromise();
        const localDb = localConnection.useDb('hubtrack');
        console.log('Successfully connected to local MongoDB database: hubtrack');

        // Define the schema for device labels
        const deviceLabelSchema = new mongoose.Schema({
            deviceLabel: String,
            status: String,
            deviceId: String,
            deviceToken: String,
            feedOrgID: [String],
            syncUsers: Number,
            syncContainers: Number,
            cldcleanoutreq: Number,
            cldlockout: Number,
            cooldownsp: Number,
            curhosealrtsp: Number,
            cwtlbs: Number,
            dgundrtmpsp: Number,
            dtempsp: Number,
            dwtlbs: Number,
            enableoutdrheat: Number,
            lastUpdated: Date,
            mfault: Number,
            nodeheartbt: Number,
            plcheartbt: Number,
            resethour: Number,
            respercentfull: Number,
            smartcwtlbs: Number,
            autosts: Number,
            avail: Number,
            biofreq: Number,
            bndlowerrecsp: Number,
            bndupperrecsp: Number,
            cfault: Number,
            contchngreq: Number,
            cookint: Number,
            cookstrt: Number,
            cpmprecin: Number,
            cpmprecout: Number,
            cpumplkdet: Number,
            ctnkauto: Number,
            curhilvldet: Number,
            dfault: Number,
            dhosealertsp: Number,
            digbaselvlsp: Number,
            dpmpeff: Number,
            dpumplkdet: Number,
            dpumprevsp: Number,
            dtankfullsp: Number,
            dtanknearfullsp: Number,
            fastpumpesp: Number,
            fpdint: Number,
            fstpmprecsp: Number,
            medpmprecsp: Number,
            medpupesp: Number,
            minfdwtpmpdisable: Number,
            pceaavg: Number,
            pceapoorsp: Number,
            pceashiftsp: Number,
            pstfeedwaitsp: Number,
            smartcontainernum: Number,
            smrtcntfillsp: Number,
            uptime: Number,
            srvmssg: Number,
            dotsp: Number,
            machineName: String
        }, { collection: 'globalDeviceLabels' });

        // Create model for local connection
        const LocalDeviceLabel = localDb.model('DeviceLabel', deviceLabelSchema);

        // Read all labels from local database
        console.log('\nReading labels from local database...');
        const labels = await LocalDeviceLabel.find({}).lean();
        console.log(`Found ${labels.length} labels in local database`);
        
        if (labels.length > 0) {
            console.log('\nSample of first label:');
            console.log(JSON.stringify(labels[0], null, 2));
        }

    } catch (error) {
        console.error('\nError checking local database:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.stack) console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        // Close connection
        if (localConnection) {
            await localConnection.close();
            console.log('\nLocal connection closed');
        }
        process.exit();
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('\nUncaught Exception:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
});

checkLocalDb(); 