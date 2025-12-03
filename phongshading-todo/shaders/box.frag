#version 300 es
precision mediump float;

out vec4 FragColor;

uniform float ambientStrength, specularStrength, diffuseStrength,shininess;

in vec3 Normal;//法向量
in vec3 FragPos;//相机观察的片元位置
in vec2 TexCoord;//纹理坐标
in vec4 FragPosLightSpace;//光源观察的片元位置

uniform vec3 viewPos;//相机位置
uniform vec4 u_lightPosition; //光源位置	
uniform vec3 lightColor;//入射光颜色

uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler;//盒子纹理采样器


float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    // 执行透视除法，将裁剪空间坐标转换为NDC坐标[-1,1]
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

    // 将NDC坐标转换为[0,1]范围的纹理坐标
    projCoords = projCoords * 0.5 + 0.5;

    // 如果片段在光源视锥体之外，则不在阴影中
    if(projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 ||
    projCoords.y < 0.0 || projCoords.y > 1.0) {
        return 0.0;
    }

    // 从阴影贴图中获取最近的深度值（从光源视角）
    float closestDepth = texture(depthTexture, projCoords.xy).r;

    // 获取当前片段的深度值（从光源视角）
    float currentDepth = projCoords.z;

    // 添加阴影偏移量来避免阴影痤疮（shadow acne）
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);

    // 检查当前片段是否在阴影中
     float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;

    // 使用PCF（百分比渐进过滤）来柔化阴影边缘
    vec2 texelSize = 1.0 / vec2(textureSize(depthTexture, 0));
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(depthTexture, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;

    return shadow;
}       

void main()
{
    
    //采样纹理颜色
    vec3 TextureColor = texture(diffuseTexture, TexCoord).xyz;

    //计算光照颜色
 	vec3 norm = normalize(Normal);
	vec3 lightDir;
	if(u_lightPosition.w==1.0) 
        lightDir = normalize(u_lightPosition.xyz - FragPos);
	else lightDir = normalize(u_lightPosition.xyz);
	vec3 viewDir = normalize(viewPos - FragPos);
	vec3 halfDir = normalize(viewDir + lightDir);


    /*TODO2:根据phong shading方法计算ambient,diffuse,specular*/
    vec3 ambient = ambientStrength * lightColor;

    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * diff * lightColor;

    float spec = pow(max(dot(norm, halfDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;
  
  	vec3 lightReflectColor=(ambient +diffuse + specular);

    //判定是否阴影，并对各种颜色进行混合
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);
	
//    vec3 resultColor =(ambient + (1.0-shadow) * (diffuse + specular))* TextureColor;
    vec3 resultColor=(1.0-shadow/2.0)* lightReflectColor * TextureColor;
    
    FragColor = vec4(resultColor, 1.f);
}


