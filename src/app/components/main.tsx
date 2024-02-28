import PhotoCamera from "@mui/icons-material/PhotoCamera";
import ImageIcon from "@mui/icons-material/Image";
import React, { FormEvent, useEffect, useReducer, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  Box,
  TextField,
  IconButton,
  useMediaQuery,
  useTheme,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Avatar,
  Dialog,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  Button,
  Grid,
  Chip,
  Paper,
  FormControlLabel,
  Grow,
  Switch,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useChat } from "ai/react";
import CodeBlock from "./Markdown";
import Navbar from "./Navbar";
import AppImages, { ImageFile } from "./Images";
import UrlTracker from "./Detalis/Search";
import QueryButton from "./Detalis/Query";
import CodeResult from "./Detalis/CodeInterpreters";

interface ChatCompletionChunk {
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

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function Chat() {

  const [PHPoutput, setPHP] = useState<string>("");
  const [Pythonoutput, setPy] = useState<string>("");
  const [CodeType, SetCodeType] = useState<string>("");


 


  const storedMessages = JSON.parse(
    typeof window !== "undefined"
      ? localStorage.getItem("messages") || "[]"
      : "[]"
  );

  const [images, setImages] = useState<ImageFile[]>([]);
  const [model, setModel] = useState(() => {
    const storedModel =
      typeof window !== "undefined" ? localStorage.getItem("model") : "";
    return storedModel || "";
  });

  const [apiKey, setApiKey] = useState(() => {
    const storedApiKey =
      typeof window !== "undefined" ? localStorage.getItem("apiKey") : "";
    return storedApiKey || "GigAI-";
  });
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    data,
  } = useChat({
    initialMessages: storedMessages,
    api:"AI/api/chat",
    body: {
      images: images,
      model,
      apiKey,
    },
  });
  //////////////////////////////////////


  useEffect(() => {
    if (model !== "") {
      localStorage.setItem("model", model);
    }
  }, [model]);

  useEffect(() => {
    localStorage.setItem("apiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));

  }, [messages]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isImagesPopupOpen, setImagesPopupOpen] = useState(false);

  const toggleImagesPopup = () => {
    setImagesPopupOpen(!isImagesPopupOpen);
  };

  const clearMessages = () => {
    stop();
    localStorage.removeItem("messages");
    window.location.reload();
  };

  interface DetailsProps {
    id: string;
    data: any;
  }

  useEffect(() => {
    if (data) {
      data.forEach((chunk) => {
        const chatChunk = chunk as ChatCompletionChunk;
        
        if (chatChunk.Code?.php_result) {
          setPHP(chatChunk.Code.php_result!);
          SetCodeType("php");
        } else if (chatChunk.Code?.Python3_result) {
          setPy(chatChunk.Code.Python3_result!);
          SetCodeType("python");
        } else {
          SetCodeType("");
          setPy("");
          setPHP("");
        }
      });
    }
  }, [data]);


  const Details: React.FC<DetailsProps> = ({ id, data }) => {
    const Key = `${id}`;
    let lastData = "";

    const StoredData = localStorage.getItem(Key);
    if (StoredData) {
      lastData = JSON.parse(StoredData);
    } else if (data && data.length > 0) {
      const newestTool = data[data.length - 1];
      if (newestTool) {
        localStorage.setItem(Key, JSON.stringify(newestTool));
        lastData = newestTool;
      }
    }
    return (
      <div>
        <Box sx={{ m: 1 }}>
          {lastData &&
            JSON.parse(JSON.stringify(lastData)).id &&
            JSON.parse(JSON.stringify(lastData)).model && (
              <>
              <Chip label={JSON.parse(JSON.stringify(lastData)).id}></Chip>
                <Box  sx={{ m: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      backgroundColor: "#2a2a2a",
                    }}
                  >
                    Model: {JSON.parse(JSON.stringify(lastData)).model}
                  </Paper>
                </Box>
              </>
            )}
          {JSON.parse(JSON.stringify(lastData))?.Web?.Query && (
            <QueryButton
              Query={JSON.parse(JSON.stringify(lastData))?.Web?.Query}
            />
          )}
          {PHPoutput && PHPoutput.length > 2 && (
            <CodeResult Code={PHPoutput} Type={CodeType} />
          )}
          {Pythonoutput && Pythonoutput.length > 2 && (
            <CodeResult Code={Pythonoutput} Type={CodeType} />
          )}
        </Box>
      </div>
    );
  };
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Navbar
        model={model}
        setModel={setModel}
        apiKey={apiKey}
        setApiKey={setApiKey}
        clearMessages={clearMessages}
        isMobile={isMobile}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          boxSizing: "border-box",
          mt: 4,
          pb: isMobile ? "20%" : "10%",
        }}
      >
        <Box
          sx={{
            mt: 7,
            flexGrow: 1,
            overflow: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.map((m, index) => (
            <Box
              key={index}
              bgcolor={m.role === "user" ? "#262626" : "#232424"}
              borderRadius={4}
              borderBottom={1}
              borderColor={"#313131"}
              p={2}
              mb={2}
              width="fit-content"
              maxWidth="95%"
              alignSelf={m.role === "user" ? "flex-end" : "flex-start"}
              sx={{ whiteSpace: "break-spaces", overflowWrap: "break-word" }}
            >
              {m.role === "user" ? (
                <div style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                  <Avatar />
                  {m.content}{" "}
                </div>
              ) : (
                <div>
                  <Avatar src={`https://main.gigasoft.com.pl/logo.png`} />
                  
                  {model !== "GigAI-v1" && (
                    
                    <Details data={data} id={m.id}></Details>
                  )}
                  <CodeBlock text={m.content} />
                </div>
              )}
            </Box>
          ))}
        </Box>

        {model !== "GigAI-v1" && (
          <Dialog
            open={isImagesPopupOpen}
            onClose={toggleImagesPopup}
            fullWidth
            maxWidth="sm"
          >
            <AppImages images={images} setImages={setImages} />
          </Dialog>
        )}
        {isLoading && (
          <div>
            <Box sx={{ position: "center" }}>
              <Box
                bgcolor={"#232424"}
                borderRadius={4}
                sx={{
                  position: "fixed",
                  bottom: "100px",
                  left: "30px",
                }}
              >
                <Button onClick={stop}>Stop Generating</Button>
              </Box>
            </Box>
          </div>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: isMobile ? "10px" : "20px",
            display: "flex",
            alignItems: "center",
            backgroundColor: "background.paper",
            zIndex: 1000,
          }}
        >
          <TextField
            fullWidth
            placeholder="Say something..."
            autoComplete="off"
            value={input}
            disabled={isLoading}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            multiline
            sx={{ mr: 1, flex: 1, overflow: "auto" }}
          />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {isLoading ? (
              <CircularProgress size={24} sx={{ color: "primary.main" }} />
            ) : (
              <>
              {model !== "GigAI-v1" && (
                <IconButton onClick={toggleImagesPopup} disabled={isLoading}>
                  <ImageIcon />
                </IconButton>
              )}
                <IconButton type="submit" color="primary" disabled={isLoading}>
                  <SendIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
