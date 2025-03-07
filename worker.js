self.addEventListener('message', function(event) {
    const rawData = event.data;

    const data = JSON.parse(rawData);

    let imuData = { yaw: 0, pitch: 0, roll: 0 };

    if (data.yaw !== undefined && data.pitch !== undefined && data.roll !== undefined) {
        imuData = {
            yaw: data.yaw,
            pitch: data.pitch,
            roll: data.roll,
        };

        // Post processed IMU data back to the main thread
        self.postMessage({ type: 'IMU', processedData: imuData });
    } else if (data.Yaw !== undefined && data.Pitch !== undefined && data.Roll !== undefined) { // account for different data format from the backend
        imuData = {
            yaw: data.Yaw,
            pitch: data.Pitch,
            roll: data.Roll,
        };

        // Post processed IMU data back to the main thread
        self.postMessage({ type: 'IMU', processedData: imuData });
    }
});