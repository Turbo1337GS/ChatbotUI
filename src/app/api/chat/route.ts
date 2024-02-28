import {
  experimental_StreamData,
  OpenAIStream,
  StreamingTextResponse,
  COMPLEX_HEADER,
  JSONValue,
} from "ai";
interface OcrResponse {
  id: string;
  object: string;
  created: string;
  model: string;
  OcrText: string;
}
export interface ChatCompletionChunk {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  Code?: {
    php_result?: string;
    Python3_result?: string;
  };
  Web?: {
    Analyzing_URL?: string;
    Query?: string;
  };
  Wait?: string;
  image_url?: string;
}
// Helper function:
function removeUndefinedFields(obj: any): JSONValue {
  const result: any = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (typeof value === "object" && value !== null) {
      result[key] = removeUndefinedFields(value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
}

export async function POST(req: Request) {
  const { messages, model, apiKey, images } = await req.json();
  let api_key = apiKey;

  //if (model === "GigAI-v1") 
  api_key = process.env.GIGAI;



  if (!api_key) {
    return new Response(
      "API key not found! Please provide the API key! You can find the API key at https://main.gigasoft.com.pl/m/API"
    );
  }
  if (!model) {
    return new Response("Please chose model, in Navbar!");
  }

  const URL: string = "https://main.gigasoft.com.pl/v2/chat/completions";
  //const URL: string = "http://localhost:3001/api/chat";

  const apiResponse = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify({
      model: model,
      stream: true,
      messages,
      ...(images.length > 0 ? { image_url: images[0].preview } : {}),
      functions: [
         { name: "qr_creator" },
        // { name: "github_api_user_info" },
        // { name: "CheckWeather" },
        // { name: "GigaGem" },
        // { name: "GithubReadME" },
        // { name: "php_interpreter" },
        // { name: "python3_interpreter" },
        { name: "web" },
      ],
    }),
  });

  if (apiResponse.status !== 200) {
    return new Response(
      "Invalid API key! Create your key at https://main.gigasoft.com.pl/m/API"
    );
  }

  if (model === "GigAI-OCR" && images) {
    const ocrResponse = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        model: "GigAI-OCR",
        url: images[0].preview,
      }),
    });
    if (ocrResponse.ok) {
      const jsonResponse = await ocrResponse.json();
      const parsedObject: OcrResponse = JSON.parse(jsonResponse);
      return new Response(parsedObject.OcrText);
    }
    if (ocrResponse.status !== 200) {
      return new Response(
        "Invalid API key! Create your key at https://main.gigasoft.com.pl/m/API"
      );
    }
  
  }
  if (model === "GigAI-v1") {
    const stream = OpenAIStream(apiResponse);
    return new StreamingTextResponse(stream);
  } else {
    let json: ChatCompletionChunk;

    const data = new experimental_StreamData();
    // Look this :(
    //https://github.com/vercel/ai/issues/970
    if (apiResponse.body) {
      const customReaderStream = new ReadableStream({
        async start(controller) {
          const reader = apiResponse.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value !== undefined) {
              controller.enqueue(value);
              let chunkText = new TextDecoder().decode(value);
              chunkText = chunkText.replace(/^data: /, "");
              chunkText = chunkText.replace(/\n\n$/, "");
              chunkText = chunkText.trim();
              try {
                json = JSON.parse(chunkText);
              } catch (error) {
                console.error(error);
                continue;
              }
            }
          }
          controller.close();
        },
      });

      const customResponse = new Response(customReaderStream);

      const stream = OpenAIStream(customResponse, {
        onToken(token) {
          if (json) {
            const cleanedJson = removeUndefinedFields(json) as {
              [key: string]: JSONValue;
            };
            data.append(cleanedJson);
          }
        },
        onFinal(completion) {
          data.close();
        },
        experimental_streamData: true,
      });

      return new StreamingTextResponse(
        stream,
        { headers: { COMPLEX_HEADER } },
        data
      );
    }
  }
}
