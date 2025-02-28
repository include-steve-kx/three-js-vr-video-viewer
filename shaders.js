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

export const fsSphereFishEye = `
    ${commonShader}
    #define PI 3.14159

    varying vec2 vUv;

    uniform float exp1;
    uniform float exp2;

    uniform float xOffset;
    uniform float yOffset;

    uniform sampler2D map;

    uniform bool displayMap;

    vec2 rotateUV (vec2 originalUV, float xOffset, float yOffset) {
        // Input: originalUV (vec2) in [0,1]x[0,1]
        // horizontalRotationAngle: angle in radians ([-PI, PI]) defining the arbitrary axis in the x-z plane (0 = x-axis)
        // rotationAngle: rotation amount around that axis (in radians)

        float horizontalRotationAngle = xOffset * PI / 180.; // provided
        float rotationAngle = yOffset * PI / 180.; // provided

        // Convert original UV to spherical coordinates:
        float origTheta = originalUV.x * (2.0 * PI);
        float origPhi   = PI * (1.0 - originalUV.y); // since v = 1 -> φ = 0, v = 0 -> φ = PI

        // Convert spherical coordinates to a 3D unit sphere position:
        vec3 pos;
        pos.x = sin(origPhi) * cos(origTheta);
        pos.y = cos(origPhi);
        pos.z = sin(origPhi) * sin(origTheta);

        // Precompute sine and cosine for the horizontal rotation angle:
        float cosH = cos(horizontalRotationAngle);
        float sinH = sin(horizontalRotationAngle);

        // Rotation matrices around the y-axis for alignment:
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
            1.0,              0.0,               0.0,
            0.0, cos(rotationAngle), -sin(rotationAngle),
            0.0, sin(rotationAngle),  cos(rotationAngle)
        );

        // Compose the rotations:
        // First, align the arbitrary axis with x-axis, then rotate about x, then undo the alignment.
        vec3 rotatedPos = Ry_pos * Rx * Ry_neg * pos;

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
        uv = rotateUV(uv, xOffset, yOffset);

        // step 2: stretch UV
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
            col = vec3(0., oldUV.y, 0.);

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

    uniform float xOffset;
    uniform float yOffset;

    uniform sampler2D map;

    uniform float vFov; // vertical FOV
    uniform float aspectRatio; // width / height
    uniform vec3 cameraDirection; // sphere 360 camera world space direction

    vec2 rotateUV (vec2 originalUV, float xOffset, float yOffset) {
        // Input: originalUV (vec2) in [0,1]x[0,1]
        // horizontalRotationAngle: angle in radians ([-PI, PI]) defining the arbitrary axis in the x-z plane (0 = x-axis)
        // rotationAngle: rotation amount around that axis (in radians)

        float horizontalRotationAngle = xOffset * PI / 180.; // provided
        float rotationAngle = yOffset * PI / 180.; // provided

        // Convert original UV to spherical coordinates:
        float origTheta = originalUV.x * (2.0 * PI);
        float origPhi   = PI * (1.0 - originalUV.y); // since v = 1 -> φ = 0, v = 0 -> φ = PI

        // Convert spherical coordinates to a 3D unit sphere position:
        vec3 pos;
        pos.x = sin(origPhi) * cos(origTheta);
        pos.y = cos(origPhi);
        pos.z = sin(origPhi) * sin(origTheta);

        // Precompute sine and cosine for the horizontal rotation angle:
        float cosH = cos(horizontalRotationAngle);
        float sinH = sin(horizontalRotationAngle);

        // Rotation matrices around the y-axis for alignment:
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
            1.0,              0.0,               0.0,
            0.0, cos(rotationAngle), -sin(rotationAngle),
            0.0, sin(rotationAngle),  cos(rotationAngle)
        );

        // Compose the rotations:
        // First, align the arbitrary axis with x-axis, then rotate about x, then undo the alignment.
        vec3 rotatedPos = Ry_pos * Rx * Ry_neg * pos;

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
        uv = rotateUV(uv, xOffset, yOffset);

        // step 2: stretch UV
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