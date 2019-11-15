#include <napi.h>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

namespace BoardMapper
{
	int g_Width, g_Height, g_BytesPerPixel;
	stbi_uc* g_Image = nullptr;

	Napi::Value GetBuildTime(const Napi::CallbackInfo& a_Info)
	{
		Napi::Env t_Env = a_Info.Env();
		char t_Text[128];
		snprintf(t_Text, 128, "%s at %s", __DATE__, __TIME__);
		return Napi::String::New(t_Env, t_Text);
	}

	Napi::Value Load(const Napi::CallbackInfo& a_Info)
	{
		Napi::Env t_Env = a_Info.Env();

		if (a_Info.Length() != 1) 
		{
			char t_Text[64];
			snprintf(t_Text, 64, "BoardMapper::Load expected %d arguments, got %d instead.", 1, (int)a_Info.Length());
			Napi::TypeError::New(t_Env, t_Text).ThrowAsJavaScriptException();
			return t_Env.Null();
		}

		if (!a_Info[0].IsString())
		{
			Napi::TypeError::New(t_Env, "First argument is required to be a string.").ThrowAsJavaScriptException();
			return t_Env.Null();
		}

		std::string t_String = a_Info[0].As<Napi::String>().ToString();
		g_Image = stbi_load(t_String.c_str(), &g_Width, &g_Height, &g_BytesPerPixel, 0);

		if (g_Image)
			printf("BoardMapper::Load: Loaded an image of size %d x %d with %d bpp\n", g_Width, g_Height, g_BytesPerPixel);

		return Napi::Boolean::New(t_Env, g_Image != nullptr);
	}

	Napi::Value Unload(const Napi::CallbackInfo& info)
	{
		Napi::Env t_Env = info.Env();

		if (g_Image == nullptr)
			return Napi::Boolean::New(t_Env, true);

		stbi_image_free(g_Image);
		g_Image = nullptr;

		return Napi::Boolean::New(t_Env, g_Image == nullptr);
	}

	template<int i>
	Napi::Value GetColour(const Napi::CallbackInfo& a_Info)
	{
		Napi::Env t_Env = a_Info.Env();
		if (g_Image == nullptr)
		{
			Napi::TypeError::New(t_Env, "You first have to load an image with BoardMapper::Load!").ThrowAsJavaScriptException();
			return t_Env.Null();
		}

		if (a_Info.Length() != 2)
		{
			char t_Text[64];
			snprintf(t_Text, 64, "BoardMapper::Load expected %d arguments, got %d instead.", 2, (int)a_Info.Length());
			Napi::TypeError::New(t_Env, t_Text).ThrowAsJavaScriptException();
			return t_Env.Null();
		}

		if (!a_Info[0].IsNumber() || !a_Info[1].IsNumber())
		{
			Napi::TypeError::New(t_Env, "We're expecting two numbers as arguments, ranging from 0~1, based on position relative to the size of the board.").ThrowAsJavaScriptException();
			return t_Env.Null();
		}

		double x = a_Info[0].As<Napi::Number>().DoubleValue();
		double y = a_Info[1].As<Napi::Number>().DoubleValue();

		if (x < 0 || y < 0 || x > 1 || y > 1)
			printf("BoardMapper::GetColour expected x and y between 0 and 1, got %3.2f and %3.2f instead. We're clamping these numbers!\n", x, y);

		if (x < 0) x = 0;
		if (y < 0) y = 0;

		x *= g_Width;
		y *= g_Height;

		// Not exact, but i dont think the exact edges are needed?
		if (y >= g_Height)
			y = g_Height - 1;
		if (x >= g_Width)
			x = g_Width - 1;

		size_t t_PixelIndex = (size_t)floor(y) * g_Width + (size_t)floor(x);
		
		size_t t_Max = g_Height * g_Width * g_BytesPerPixel;
		printf("BoardMapper::GetColour: %3.2f and %3.2f -> pixel %zu / %zu\n", x, y, t_PixelIndex * g_BytesPerPixel + i, t_Max);
		
		unsigned char t_Colour = g_Image[t_PixelIndex * g_BytesPerPixel + i];
		return Napi::Number::New(t_Env, t_Colour);
	}

	Napi::Object Init(Napi::Env a_Env, Napi::Object a_Exports)
	{
		a_Exports.Set(Napi::String::New(a_Env, "load"), Napi::Function::New(a_Env, Load));
		a_Exports.Set(Napi::String::New(a_Env, "unload"), Napi::Function::New(a_Env, Unload));
		a_Exports.Set(Napi::String::New(a_Env, "getRed"), Napi::Function::New(a_Env, GetColour<0>));
		a_Exports.Set(Napi::String::New(a_Env, "getGreen"), Napi::Function::New(a_Env, GetColour<1>));
		a_Exports.Set(Napi::String::New(a_Env, "getBlue"), Napi::Function::New(a_Env, GetColour<2>));
		a_Exports.Set(Napi::String::New(a_Env, "getBuildTime"), Napi::Function::New(a_Env, GetBuildTime));
		return a_Exports;
	}

	NODE_API_MODULE(BoardMapperCPP, Init)
}
