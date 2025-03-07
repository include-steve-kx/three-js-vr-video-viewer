export const vsSphere = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }
`;

const commonShader = `
    float remap01 (float x, float low, float high) {
        return clamp((x - low) / (high - low), 0., 1.);
    }

    float remap (float x, float lowIn, float highIn, float lowOut, float highOut) {
        return mix(lowOut, highOut, remap01(x, lowIn, highIn));
    }
`;

export const fsTest = `
    ${commonShader}
    #define PI 3.14159

    varying vec2 vUv;

    uniform float yOffset;

    float findComplementX(float x) {
        float xComplement = x + 0.5;
        if (xComplement > 1.) xComplement -= 1.;
        return xComplement;
    }

    float findComplementY(float y, bool isMoreThanOne) {
        if (isMoreThanOne) return 1. * 2. - y;
        else return 0. * 2. - y;
    }

    void main() {
        vec2 uv = vUv;

        float alpha = 1.;
        vec3 col = vec3(0.);

        col.r = uv.x;

        float xOffset = 0.1;
        float xComplement = findComplementX(xOffset);

        // if (abs(uv.x - xOffset) < 0.05) {
        //     float uvYOffset = yOffset / 180.;

        //     uv.y += uvYOffset;
        //     if (uv.y <= 0.) {
        //         uv.x = findComplementX(uv.x);
        //         uv.y = findComplementY(uv.y, false);
        //     } else if (uv.y >= 1.) {
        //         uv.x = findComplementX(uv.x);
        //         uv.y = findComplementY(uv.y, true);
        //     }
        // }
        // else if (abs(uv.x - xComplement) < 0.05) {
        //     float uvYOffset = yOffset / 180.;

        //     uv.y -= uvYOffset;
        //     if (uv.y <= 0.) {
        //         uv.x = findComplementX(uv.x);
        //         uv.y = findComplementY(uv.y, false);
        //     } else if (uv.y >= 1.) {
        //         uv.x = findComplementX(uv.x);
        //         uv.y = findComplementY(uv.y, true);
        //     }
        // }

        float theta = uv.x * PI * 2.; // uv.y --> rad; [0, 1] --> [0, PI * 2]
        float phi = yOffset * PI / 180.; // degree --> rad; [-90, 90] --> [-PI / 2, PI / 2]
        if (cos(theta) * sin(phi) < -1. || cos(theta) * sin(phi) > 1.) {
            col = vec3(1., 0., 0.);
            return;
        }
        float result = asin( cos(theta) * sin(phi) ); // rad --> rad

        // uv.y = remap(result, -PI/2., PI/2., 0., 1.);

        float uvYOffset = result / PI; // rad --> uv.y
        uv.y += uvYOffset;
        // if (uv.y <= 0.) {
        //     uv.x = findComplementX(uv.x);
        //     uv.y = findComplementY(uv.y, false);
        // } else if (uv.y >= 1.) {
        //     uv.x = findComplementX(uv.x);
        //     uv.y = findComplementY(uv.y, true);
        // }


        float section = 20.;
        if (fract(uv.y * section) < 0.05) col = vec3(1.);

        // col = vec3(uv.x, 0., 0.);
        // col = vec3(0., uv.y, 0.);

        gl_FragColor = vec4(col, alpha);
    }
`;

export const fsTest2 = `
    ${commonShader}
    #define PI 3.14159

    varying vec3 vPosition;

    uniform float xOffset;
    uniform float yOffset;

    void main() {
        // Assume "pos" is the normalized vertex position (on the unit sphere)
        // and "rotationAngle" is your theta (in radians) for the x-axis rotation.

        float rotationAngle = yOffset * PI / 180.;

        vec3 pos = normalize(vPosition); // original vertex position on sphere

        // Original spherical coordinates:
        float origTheta = atan(pos.z, pos.x);  // range: (-PI, PI]
        float origPhi   = acos(clamp(pos.y, -1.0, 1.0));  // range: [0, PI]

        // Apply x-axis rotation
        vec3 rotatedPos;
        rotatedPos.x = pos.x;
        rotatedPos.y = pos.y * cos(rotationAngle) - pos.z * sin(rotationAngle);
        rotatedPos.z = pos.y * sin(rotationAngle) + pos.z * cos(rotationAngle);

        // Compute new spherical coordinates from rotated position
        float newPhi   = acos(clamp(rotatedPos.y, -1.0, 1.0));
        float newTheta = atan(rotatedPos.z, rotatedPos.x);

        // Map back to UV coordinates:
        vec2 newUV;
        newUV.x = (newTheta < 0.0 ? newTheta + 2.0 * PI : newTheta) / (2.0 * PI);
        newUV.y = 1. - newPhi / PI;




        float alpha = 1.;
        vec3 col = vec3(0.);

        float section = 20.;
        if (fract(newUV.y * section) < 0.05) col = vec3(1.);

        gl_FragColor = vec4(col, alpha);
    }
`;

export const fsSphereVideoStrip = `
    ${commonShader}
    #define PI 3.14159

    varying vec2 vUv;
    varying vec3 vPosition;

    uniform float exp1;
    uniform float exp2;

    uniform float xOffset;
    uniform float yOffset;
    
    uniform sampler2D map;

    uniform bool displayMap;

    vec2 rotateUV(float xOffset, float yOffset, vec3 vPosition) {
        // Assume:
        // - vPosition is the original vertex position (not necessarily normalized)
        // - horizontalRotationAngle is the angle (in radians, in [-PI, PI]) that defines 
        //   the direction of the arbitrary axis in the x-z plane (0 = x-axis, PI/2 = z-axis)
        // - rotationAngle is the amount of rotation around the arbitrary axis

        float horizontalRotationAngle = xOffset * PI / 180.;
        float rotationAngle = yOffset * PI / 180.;

        // Normalize the vertex position (assuming a unit sphere)
        vec3 pos = normalize(vPosition);

        // Compute sine and cosine for the horizontal rotation angle
        float cosH = cos(horizontalRotationAngle);
        float sinH = sin(horizontalRotationAngle);

        // Build rotation matrices around the y-axis:
        mat3 Ry_neg = mat3(
            cosH,  0.0, -sinH,
            0.0,   1.0,  0.0,
            sinH,  0.0,  cosH
        );
        mat3 Ry_pos = mat3(
            cosH,  0.0, sinH,
            0.0,   1.0, 0.0,
            -sinH,  0.0, cosH
        );

        // Rotation matrix for rotation around the x-axis:
        mat3 Rx = mat3(
            1.0,             0.0,              0.0,
            0.0, cos(rotationAngle), -sin(rotationAngle),
            0.0, sin(rotationAngle),  cos(rotationAngle)
        );

        // Compose the rotations: first align, then rotate, then undo the alignment.
        vec3 rotatedPos = Ry_pos * Rx * Ry_neg * pos;

        // Convert the rotated position back into spherical coordinates:
        float newPhi   = acos(clamp(rotatedPos.y, -1.0, 1.0));
        float newTheta = atan(rotatedPos.z, rotatedPos.x);

        // Map the spherical coordinates to UV space:
        vec2 newUV;
        newUV.x = (newTheta < 0.0 ? newTheta + 2.0 * PI : newTheta) / (2.0 * PI);
        newUV.y = 1. - newPhi / PI;

        return newUV;
    }

    void main() {

        float alpha = 1.;
        vec3 col = vec3(0.);

        vec2 uv = vUv;

        // step 1: rotate UV
        uv = rotateUV(xOffset, yOffset, vPosition);

        // step 2: stretch UV
        uv.y = -pow(1. - uv.y, exp2) + 1.;


        // step 3: display map or not
        if (displayMap) {
            col = texture(map, uv).rgb;
        } else {
            col = vec3(0., uv.y, 0.);

            float section = 20.;
            if (fract(uv.y * section) < 0.05) col = vec3(1.);
        }

        gl_FragColor = vec4(col, alpha);
    }
`;

export const fsSphereEquidistant = `
    uniform sampler2D uTexture; // Fisheye video texture.
    uniform float uFOV;         // Horizontal FOV in radians (e.g., PI for 180°).
    varying vec2 vUv;           // Varying UV from SphereGeometry.

    const float PI = 3.141592653589793;

    void main() {
        // Convert sphere UV to spherical coordinates.
        // vUv.x maps to azimuth (θ), vUv.y maps to polar angle (φ).
        float theta = vUv.x * (2.0 * PI);      // azimuthal angle, [0, 2PI]
        float phi = PI * (1.0 - vUv.y);          // polar angle, with vUv.y=1 at north (φ=0) and vUv.y=0 at south (φ=PI)

        // Convert spherical coordinates to a 3D direction vector.
        vec3 dir = vec3(
            sin(phi) * cos(theta),  // x
            cos(phi),               // y
            sin(phi) * sin(theta)   // z
        );
        
        // The camera (fisheye) optical axis (pointing downward).
        vec3 camDir = vec3(0.0, -1.0, 0.0);
        
        // Compute the angle between the current direction and the camera optical axis.
        float angle = acos(clamp(dot(dir, camDir), -1.0, 1.0));
        
        // Compute the effective focal length (f) for the equidistant model.
        // We assume that the valid fisheye circle is centered at (0.5, 0.5) with radius 0.5.
        // At maximum valid angle (uFOV/2) we want r = 0.5.
        float f = 0.5 / (uFOV * 0.5); // This simplifies to: f = 1.0 / uFOV.
        float r = f * angle;          // Equidistant mapping: r = f * θ.
        
        // If the angle is larger than half the FOV, the pixel is not captured by the camera.
        if (angle > (uFOV * 0.5)) {
            gl_FragColor = vec4(0.0); // Black for regions not captured.
            return;
        }
        
        // Compute the 2D direction for the fisheye texture sample.
        // Project the 3D direction onto the image plane perpendicular to the camera optical axis.
        vec2 fisheyeUV;
        if (angle < 1e-5) {
            // At the center, avoid dividing by zero.
            fisheyeUV = vec2(0.5, 0.5);
        } else {
            vec3 proj = normalize(dir - dot(dir, camDir) * camDir);
            // Map the projected vector to texture space.
            // Here, proj.x and proj.z form the 2D coordinates on the camera's image plane.
            fisheyeUV = vec2(0.5) + r * vec2(proj.x, proj.z);
        }
        
        // Optional: Clamp coordinates. If the computed UV falls outside the valid region, output black.
        if (fisheyeUV.x < 0.0 || fisheyeUV.x > 1.0 || fisheyeUV.y < 0.0 || fisheyeUV.y > 1.0) {
            gl_FragColor = vec4(0.0);
        } else {
            gl_FragColor = texture2D(uTexture, fisheyeUV);
        }
    }
`;

export const fsSphereFishEyeNew = `
    ${commonShader}
    #define PI 3.14159

    varying vec2 vUv;

    uniform float exp1;
    uniform float exp2;
    uniform float lookoutCameraFOV;

    uniform float yawCorrection; // y
    uniform float pitchCorrection; // x
    uniform float rollCorrection; // z

    uniform float yawIMU; // y
    uniform float pitchIMU; // x
    uniform float rollIMU; // z

    uniform sampler2D map;

    uniform bool displayMap;
    uniform bool IMUCorrection;
    uniform bool IMURealtimeInverse;

    struct Bbox {
        float x;
        float y;
        float width;
        float height;
    };
    uniform Bbox bbox;

    vec2 rotateUV (vec2 originalUV, float yawIMU, float pitchIMU, float rollIMU) {
        // Input: originalUV (vec2) in [0,1]x[0,1]
        // horizontalRotationAngle: angle in radians ([-PI, PI]) defining the arbitrary axis in the x-z plane (0 = x-axis)
        // rotationAngle: rotation amount around that axis (in radians)

        // // discard yaw (heading) IMU data for now
        // float yaw = (yawIMU + (IMUCorrection ? yawCorrection : 0.)) * PI / 180.;
        float yaw = (yawIMU + (IMUCorrection ? yawCorrection : 0.)) * PI / 180.;
        float pitch = (pitchIMU + (IMUCorrection ? pitchCorrection : 0.)) * PI / 180.;
        float roll = (rollIMU + (IMUCorrection ? rollCorrection : 0.)) * PI / 180.;

        // Convert original UV to spherical coordinates:
        float origTheta = originalUV.x * (2.0 * PI);
        float origPhi   = PI * (1.0 - originalUV.y); // since v = 1 -> φ = 0, v = 0 -> φ = PI

        // Convert spherical coordinates to a 3D unit sphere position:
        vec3 pos;
        pos.x = sin(origPhi) * cos(origTheta);
        pos.y = cos(origPhi);
        pos.z = sin(origPhi) * sin(origTheta);

        mat3 Ry = mat3(
            cos(yaw), 0.0, -sin(yaw),
            0.0,      1.0,       0.0,
            sin(yaw), 0.0,   cos(yaw)
        );

        mat3 Rx = mat3(
            1.0,      0.0,      0.0,
            0.0, cos(pitch), -sin(pitch),
            0.0, sin(pitch),  cos(pitch)
        );

        mat3 Rz = mat3(
            cos(roll), -sin(roll), 0.0,
            sin(roll), cos(roll),  0.0,   
            0.0,        0.0,         1.0
        );

        // mat3 Rot = inverse(Rz * Rx * Ry);
        mat3 Rot = IMURealtimeInverse ? inverse(Rz * Rx * Ry) : Rz * Rx * Ry;
        // mat3 Rot = Rz * Rx * Ry;

        // Compose the rotations:
        vec3 rotatedPos = Rot * pos;

        // Convert rotated position back to spherical coordinates:
        float newPhi   = acos(clamp(rotatedPos.y, -1.0, 1.0));
        float newTheta = atan(rotatedPos.z, rotatedPos.x); // returns (-PI, PI]

        // Normalize newTheta to [0, 2PI]:
        if(newTheta < 0.0) {
            newTheta += 2.0 * PI;
        }

        // Map back to UV coordinates:
        vec2 newUV;
        newUV.x = newTheta / (2.0 * PI);
        newUV.y = 1.0 - (newPhi / PI);

        return newUV;
    }

    vec2 fisheyeEquidistantProjection(vec2 uv) {
        // Convert sphere UV to spherical coordinates.
        // vUv.x maps to azimuth (θ), vUv.y maps to polar angle (φ).
        float theta = uv.x * (2.0 * PI);      // azimuthal angle, [0, 2PI]
        float phi = PI * (1.0 - uv.y);          // polar angle, with vUv.y=1 at north (φ=0) and vUv.y=0 at south (φ=PI)

        // Convert spherical coordinates to a 3D direction vector.
        vec3 dir = vec3(
            sin(phi) * cos(theta),  // x
            cos(phi),               // y
            sin(phi) * sin(theta)   // z
        );
        
        // The camera (fisheye) optical axis (pointing downward).
        vec3 camDir = vec3(0.0, -1.0, 0.0);
        
        // Compute the angle between the current direction and the camera optical axis.
        float angle = acos(clamp(dot(dir, camDir), -1.0, 1.0));
        
        // Compute the effective focal length (f) for the equidistant model.
        // We assume that the valid fisheye circle is centered at (0.5, 0.5) with radius 0.5.
        // At maximum valid angle (uFOV/2) we want r = 0.5.
        float uFOV = lookoutCameraFOV * PI / 180.;
        float f = 0.5 / (uFOV * 0.5); // This simplifies to: f = 1.0 / uFOV.
        float r = f * angle;          // Equidistant mapping: r = f * θ.
        
        // If the angle is larger than half the FOV, the pixel is not captured by the camera.
        if (angle > (uFOV * 0.5)) {
            gl_FragColor = vec4(0.0); // Black for regions not captured.
            return vec2(-1., -1.);
        }
        
        // Compute the 2D direction for the fisheye texture sample.
        // Project the 3D direction onto the image plane perpendicular to the camera optical axis.
        vec2 fisheyeUV;
        if (angle < 1e-5) {
            // At the center, avoid dividing by zero.
            fisheyeUV = vec2(0.5, 0.5);
        } else {
            vec3 proj = normalize(dir - dot(dir, camDir) * camDir);
            // Map the projected vector to texture space.
            // Here, proj.x and proj.z form the 2D coordinates on the camera's image plane.
            fisheyeUV = vec2(0.5) + r * vec2(proj.x, proj.z);
        }

        return fisheyeUV;
    }

    vec3 highlightCVDetection(vec2 fisheyeUV) {
        // my input is always sphere UV
        // I have to map it to fisheye UV, check if the UV is within the detection bounding box range
        // if true, then we color this particular part of UV to a bounding box color
        // Remap the fisheye UV from [0,1] range to texture dimensions

        // if (bbox.y > 0.) {
        //     return vec3(1., 0., 0.);
        // } else {
        //     return vec3(0., 0., 0.);
        // }

        // bbox x & y at top left corner, w.r.t the top left corner of the texture, width & height
        vec2 topLeftCornerUV = vec2(0.);
        topLeftCornerUV.x = remap(bbox.x, 0., 1920., 0., 1.);
        topLeftCornerUV.y = remap(bbox.y, 0., 1080., 1., 0.);
        vec2 size = vec2(bbox.width / 1920., bbox.height / 1080.);
        
        vec3 col = vec3(0.);

        // if ((fisheyeUV.x > topLeftCornerUV.x) && (fisheyeUV.x < topLeftCornerUV.x + size.x) && (fisheyeUV.y > topLeftCornerUV.y) && (fisheyeUV.y < topLeftCornerUV.y + size.y)) {
        //     col = vec3(1., 0., 0.);
        // }
        if ((fisheyeUV.x > topLeftCornerUV.x) && (fisheyeUV.x < topLeftCornerUV.x + size.x) && (fisheyeUV.y > topLeftCornerUV.y - size.y) && (fisheyeUV.y < topLeftCornerUV.y)) {
            // col = vec3(1., 0., 0.);
            
            col.r = mix(0., 1., remap01(fisheyeUV.x, topLeftCornerUV.x - size.x / 2., topLeftCornerUV.x + size.x / 2.));
            col.g = mix(0., 1., remap01(fisheyeUV.y, topLeftCornerUV.y - size.y / 2., topLeftCornerUV.y + size.y / 2.));
        }

        return col;
    }

    void main() {
        float alpha = 1.;
        vec3 col = vec3(0.);

        vec2 uv = vUv;

        // step 1: rotate UV
        uv = rotateUV(uv, yawIMU, pitchIMU, rollIMU);


        // --------- step 2: equidistant mapping ----------- //
        vec2 fisheyeUV = fisheyeEquidistantProjection(uv);

        // --------- step 3: mark the CV detection ----------- //
        vec3 cvHighlight = highlightCVDetection(fisheyeUV);

        
        // Optional: Clamp coordinates. If the computed UV falls outside the valid region, output black.
        if (fisheyeUV.x < 0.0 || fisheyeUV.x > 1.0 || fisheyeUV.y < 0.0 || fisheyeUV.y > 1.0) {
            gl_FragColor = vec4(0.0);
        } else {
            col = texture2D(map, fisheyeUV).rgb;
            col += cvHighlight;
            gl_FragColor = vec4(col, alpha);
        }
    }
`;

export const fsSphereFishEye = `
    ${commonShader}
    #define PI 3.14159

    varying vec2 vUv;

    uniform float exp1;
    uniform float exp2;

    uniform float yawCorrection; // y
    uniform float pitchCorrection; // x
    uniform float rollCorrection; // z

    uniform float yawIMU; // y
    uniform float pitchIMU; // x
    uniform float rollIMU; // z

    uniform sampler2D map;

    uniform bool displayMap;
    uniform bool IMUCorrection;
    uniform bool IMURealtimeInverse;

    vec2 rotateUV (vec2 originalUV, float yawIMU, float pitchIMU, float rollIMU) {
        // Input: originalUV (vec2) in [0,1]x[0,1]
        // horizontalRotationAngle: angle in radians ([-PI, PI]) defining the arbitrary axis in the x-z plane (0 = x-axis)
        // rotationAngle: rotation amount around that axis (in radians)

        // // discard yaw (heading) IMU data for now
        // float yaw = (yawIMU + (IMUCorrection ? yawCorrection : 0.)) * PI / 180.;
        float yaw = (0. + (IMUCorrection ? yawCorrection : 0.)) * PI / 180.;
        float pitch = (pitchIMU + (IMUCorrection ? pitchCorrection : 0.)) * PI / 180.;
        float roll = (rollIMU + (IMUCorrection ? rollCorrection : 0.)) * PI / 180.;

        // Convert original UV to spherical coordinates:
        float origTheta = originalUV.x * (2.0 * PI);
        float origPhi   = PI * (1.0 - originalUV.y); // since v = 1 -> φ = 0, v = 0 -> φ = PI

        // Convert spherical coordinates to a 3D unit sphere position:
        vec3 pos;
        pos.x = sin(origPhi) * cos(origTheta);
        pos.y = cos(origPhi);
        pos.z = sin(origPhi) * sin(origTheta);

        mat3 Ry = mat3(
            cos(yaw), 0.0, -sin(yaw),
            0.0,      1.0,       0.0,
            sin(yaw), 0.0,   cos(yaw)
        );

        mat3 Rx = mat3(
            1.0,      0.0,      0.0,
            0.0, cos(pitch), -sin(pitch),
            0.0, sin(pitch),  cos(pitch)
        );

        mat3 Rz = mat3(
            cos(roll), -sin(roll), 0.0,
            sin(roll), cos(roll),  0.0,   
            0.0,        0.0,         1.0
        );

        // mat3 Rot = inverse(Rz * Rx * Ry);
        mat3 Rot = IMURealtimeInverse ? inverse(Rz * Rx * Ry) : Rz * Rx * Ry;

        // Compose the rotations:
        vec3 rotatedPos = Rot * pos;

        // Convert rotated position back to spherical coordinates:
        float newPhi   = acos(clamp(rotatedPos.y, -1.0, 1.0));
        float newTheta = atan(rotatedPos.z, rotatedPos.x); // returns (-PI, PI]

        // Normalize newTheta to [0, 2PI]:
        if(newTheta < 0.0) {
            newTheta += 2.0 * PI;
        }

        // Map back to UV coordinates:
        vec2 newUV;
        newUV.x = newTheta / (2.0 * PI);
        newUV.y = 1.0 - (newPhi / PI);

        return newUV;
    }

    void main() {
        float alpha = 1.;
        vec3 col = vec3(0.);

        vec2 uv = vUv;

        // step 1: rotate UV
        uv = rotateUV(uv, yawIMU, pitchIMU, rollIMU);

        // step 2: stretch UV
        // uv.y = pow(uv.y, exp1);
        uv.y = -pow(1. - uv.y, exp2) + 1.;

        vec2 oldUV = uv;

        // step 3: convert sphere UV --> texture's cartesian coordinates
        // step 3a: sphere UV --> polar coordinates
        uv.x = remap(uv.x, 0., 1., 0., PI * 2.);
        uv.y *= 0.5;
        // step 3b: polar coordinates --> texture's cartesian coordinates
        vec2 newUV = vec2( uv.y * cos(uv.x) + 0.5, uv.y * sin(uv.x) + 0.5 );

        
        // step 3: display map or not
        if (displayMap) {
            col = texture(map, newUV).rgb;
        } else {
            // col = vec3(0., oldUV.y, 0.);
            col = vec3(oldUV.x, oldUV.y, 0.);

            float section = 20.;
            if (fract(oldUV.y * section) < 0.05) col = vec3(1.);
        }

        // col = texture(map, newUV).rgb;

        gl_FragColor = vec4(col, alpha);
    }
`;

export const vsRectangle = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.);
    }
`;

export const fsRectangle = `
    ${commonShader}
    #define PI 3.14159

    varying vec2 vUv;

    uniform float exp1;
    uniform float exp2;

    uniform float yawCorrection; // y
    uniform float pitchCorrection; // x
    uniform float rollCorrection; // z

    uniform float yawIMU; // y
    uniform float pitchIMU; // x
    uniform float rollIMU; // z

    uniform sampler2D map;

    uniform bool IMUCorrection;
    uniform bool IMURealtimeInverse;

    uniform float vFov; // vertical FOV
    uniform float aspectRatio; // width / height
    uniform vec3 cameraDirection; // sphere 360 camera world space direction

    vec2 rotateUV (vec2 originalUV, float yawIMU, float pitchIMU, float rollIMU) {
        // Input: originalUV (vec2) in [0,1]x[0,1]
        // horizontalRotationAngle: angle in radians ([-PI, PI]) defining the arbitrary axis in the x-z plane (0 = x-axis)
        // rotationAngle: rotation amount around that axis (in radians)

        // // discard yaw (heading) IMU data for now
        // float yaw = (yawIMU + (IMUCorrection ? yawCorrection : 0.)) * PI / 180.;
        float yaw = (0. + (IMUCorrection ? yawCorrection : 0.)) * PI / 180.;
        float pitch = (pitchIMU + (IMUCorrection ? pitchCorrection : 0.)) * PI / 180.;
        float roll = (rollIMU + (IMUCorrection ? rollCorrection : 0.)) * PI / 180.;

        // Convert original UV to spherical coordinates:
        float origTheta = originalUV.x * (2.0 * PI);
        float origPhi   = PI * (1.0 - originalUV.y); // since v = 1 -> φ = 0, v = 0 -> φ = PI

        // Convert spherical coordinates to a 3D unit sphere position:
        vec3 pos;
        pos.x = sin(origPhi) * cos(origTheta);
        pos.y = cos(origPhi);
        pos.z = sin(origPhi) * sin(origTheta);


        
        mat3 Ry = mat3(
            cos(yaw), 0.0, -sin(yaw),
            0.0,      1.0,       0.0,
            sin(yaw), 0.0,   cos(yaw)
        );

        mat3 Rx = mat3(
            1.0,      0.0,      0.0,
            0.0, cos(pitch), -sin(pitch),
            0.0, sin(pitch),  cos(pitch)
        );

        mat3 Rz = mat3(
            cos(roll), -sin(roll), 0.0,
            sin(roll), cos(roll),  0.0,   
            0.0,        0.0,         1.0
        );

        // mat3 Rot = inverse(Rz * Rx * Ry);
        mat3 Rot = IMURealtimeInverse ? inverse(Rz * Rx * Ry) : Rz * Rx * Ry;

        // Compose the rotations:
        vec3 rotatedPos = Rot * pos;

        // Convert rotated position back to spherical coordinates:
        float newPhi   = acos(clamp(rotatedPos.y, -1.0, 1.0));
        float newTheta = atan(rotatedPos.z, rotatedPos.x); // returns (-PI, PI]

        // Normalize newTheta to [0, 2PI]:
        if(newTheta < 0.0) {
            newTheta += 2.0 * PI;
        }

        // Map back to UV coordinates:
        vec2 newUV;
        newUV.x = newTheta / (2.0 * PI);
        newUV.y = 1.0 - (newPhi / PI);

        return newUV;
    }

    void main() {
        float alpha = 1.;
        vec3 col = vec3(0.);

        vec2 uv = vUv;

        // step 0: check if this uv is within the view frustrum

        // Convert original UV to spherical coordinates:
        float origTheta = uv.x * (2.0 * PI);
        float origPhi   = PI * (1.0 - uv.y); // since v = 1 -> φ = 0, v = 0 -> φ = PI

        // Convert spherical coordinates to a 3D unit sphere position:
        vec3 pos;
        pos.x = sin(origPhi) * cos(origTheta);
        pos.y = cos(origPhi);
        pos.z = sin(origPhi) * sin(origTheta);

        // check horizontal dot product
        float ah = remap(uv.x, 0., 1., 0., PI * 2.);
        // vec3 vh1 = normalize(vec3(-cos(ah), 0., sin(ah)));
        vec3 vh1 = normalize(vec3(pos.x, 0., pos.z));
        vec3 vh2 = normalize(vec3(cameraDirection.x, 0., cameraDirection.z));
        float h = dot(vh1, vh2);
        float vFovRad = remap(vFov, 0., 360., 0., PI * 2.);
        float hFov = 2. * atan( tan(vFovRad / 2.) * aspectRatio );
        float hTh = cos(hFov / 2.);

        // check vertical dot product
        float av = remap(uv.y, 0., 1., -PI/2., PI/2.);
        // vec3 vv1 = normalize(vec3(0., av, sin(ah)));
        // vec3 vv2 = normalize(vec3(0., cameraDirection.y, 0.));
        vec3 vv1 = normalize(vec3(0., pos.y, pos.z));
        vec3 vv2 = normalize(vec3(0., cameraDirection.y, cameraDirection.z));
        float v = dot(vv1, vv2);
        float vTh = cos(remap(vFov / 2., 0., 360., 0., PI * 2.));

        float highlight = 0.7;
        if (h > hTh && v > vTh) {
            highlight = 1.;

            if (h < hTh * 1.05 || v < vTh * 1.05) {
                col = vec3(1.);
                gl_FragColor = vec4(col, alpha);
                return;
            }
        }

        // step 1: rotate UV
        uv = rotateUV(uv, yawIMU, pitchIMU, rollIMU);

        // step 2: stretch UV
        // uv.y = pow(uv.y, exp1);
        uv.y = -pow(1. - uv.y, exp2) + 1.;

        // step 3: convert sphere UV --> texture's cartesian coordinates
        // step 3a: sphere UV --> polar coordinates
        uv.x = remap(uv.x, 0., 1., 0., PI * 2.);
        uv.y *= 0.5;
        // step 3b: polar coordinates --> texture's cartesian coordinates
        vec2 newUV = vec2( uv.y * cos(uv.x) + 0.5, uv.y * sin(uv.x) + 0.5 );

        

        col = texture(map, newUV).rgb;

        col *= highlight;

        gl_FragColor = vec4(col, alpha);
    }
`;

export const fs = `
    float even2(float a) {
        return ceil(max(a, 2.) / 2.) * 2.;
    }

    varying vec2 vUv;

    uniform float exp1;
    uniform float exp2;
    uniform float yOffset;
    uniform sampler2D map;

    void main() {
        vec2 uv = vUv;
        
        // step 1: adjust the vertical offset, to make water level align around the center equator
        // uv.y = pow(uv.y, exp1);
        uv.y = -pow(1. - uv.y, exp2) + 1.;

        // step 2: adjust the horizontal offset
        

        float alpha = 1.;
        vec3 col = vec3(0.);

        // col.g = uv.y;
        col = texture(map, uv).rgb;

        gl_FragColor = vec4(col, alpha);
    }
`;