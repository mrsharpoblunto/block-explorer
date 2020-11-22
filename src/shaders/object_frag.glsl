precision mediump float;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying float v_distance;

uniform vec3 u_lightWorld;
uniform vec4 u_lightColor;
uniform vec4 u_ambient;
uniform vec4 u_diffuse;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

const float VIEW_DISTANCE = 24.0;
const float VIEW_FADE = 8.0;

vec4 lit(float l ,float h, float m) {
    return vec4(1.0,
        max(l, 0.0),
        (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
        1.0);
}

void main() {
    vec3 a_normal = normalize(v_normal);
    vec3 surfaceToView = normalize(v_surfaceToView);
    vec3 halfVector = normalize(u_lightWorld + surfaceToView);
    vec4 litR = lit(dot(a_normal, u_lightWorld),
                   dot(a_normal,  surfaceToView), u_shininess);
    vec4 outColor = vec4((
        u_lightColor * (u_diffuse * litR.y + u_diffuse * u_ambient +
            u_specular * litR.z * u_specularFactor)).rgb,
        u_diffuse.a);

    gl_FragColor = mix(outColor,vec4(0.4,0.8,1.0,1.0),v_distance > VIEW_DISTANCE ? min(1.0,(v_distance - VIEW_DISTANCE) / VIEW_FADE) : 0.0); 
}
