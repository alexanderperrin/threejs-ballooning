#define PHONG

uniform vec3 cliffColor;
uniform vec3 grassColor;
uniform vec3 sandColor;
uniform vec3 emissive;
uniform vec3 specular;
uniform vec3 xFogColor;
uniform float shininess;
uniform float opacity;
uniform float steps;
uniform float threshold;
uniform sampler2D map;
uniform float waterHeight;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	float y = floor((vWorldNormal.y) * steps + threshold) / steps;
	vec3 c = mix(sandColor, grassColor, clamp(floor(vWorldPos.y - waterHeight), 0.01, 0.99));
	c = mix(cliffColor, c, y);
	vec4 diffuseColor = vec4( c, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_flip>
	#include <normal_fragment>
	#include <emissivemap_fragment>

	// accumulation
	#include <lights_phong_fragment>
	#include <lights_template>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	float dot = pow(saturate(1.0 - dot(normalize(vViewPosition), normal)), 5.0);
	outgoingLight += vec3(0.8 * dot, dot, 0.7 * dot);

	#include <envmap_fragment>

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

	c = gl_FragColor.rgb;
	gl_FragColor = mix(vec4(c, 1), vec4(xFogColor, 1), clamp((abs(vWorldPos.x) - 128.0) / 32.0, 0.0, 1.0));
}
