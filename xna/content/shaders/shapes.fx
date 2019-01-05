#if OPENGL
	#define SV_POSITION POSITION
	#define VS_SHADERMODEL vs_3_0
	#define PS_SHADERMODEL ps_3_0
#else
	#define VS_SHADERMODEL vs_4_0_level_9_1
	#define PS_SHADERMODEL ps_4_0_level_9_1
#endif

matrix World;
matrix View;
matrix Projection;

struct VertexShaderInput
{
	float4 Position : POSITION0;
	float4 Color : COLOR;
	float4 TexCoord : TEXCOORD0;
};

struct VertexShaderOutput
{
	float4 Position : SV_POSITION;
	float4 Color : COLOR;
	float4 TexCoord : TEXCOORD0;
};

VertexShaderOutput MainVS(in VertexShaderInput input)
{
	VertexShaderOutput output = (VertexShaderOutput)0;

	input.Position.w = 1;
	output.Position = mul(input.Position, mul(mul(World, View), Projection));
	output.Color = input.Color;
	output.TexCoord = input.TexCoord;

	return output;
}

float4 CirclePS(VertexShaderOutput input) : COLOR
{
	float radius = length(input.TexCoord.xy);
	return input.Color * step(radius, 1.0);
}

float4 SquarePS(VertexShaderOutput input) : COLOR
{
	return input.Color;
}

technique DrawCircles
{
	pass P0
	{
		VertexShader = compile VS_SHADERMODEL MainVS();
		PixelShader = compile PS_SHADERMODEL CirclePS();
	}
};

technique DrawSquares
{
	pass P0
	{
		VertexShader = compile VS_SHADERMODEL MainVS();
		PixelShader = compile PS_SHADERMODEL SquarePS();
	}
};