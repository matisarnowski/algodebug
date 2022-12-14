import { CompilerRequest, CompilerResponse } from "../../types/compiler";
import { OutputParser } from "../../utils/OutputParser";
import { Compiler } from "./compilerFactory";

export class AlgoDebugCompilerImpl implements Compiler {
    static API_URL: string = "http://192.168.2.132:40042/compile";

    async compile(request: CompilerRequest): Promise<CompilerResponse> {
        const apiResponse = await fetch(AlgoDebugCompilerImpl.API_URL, {
            method: "POST",
            body: JSON.stringify({
                code: request.code,
                input: request.input,
                language: request.language,
            }),
            headers: { "Content-Type": "application/json" },
        });
        const response: CodexApiResponse = await apiResponse.json();

        if (response.success) {
            return {
                success: true,
                output: new OutputParser(response.output).parse(),
                errorMessage: null,
            };
        } else {
            return {
                success: false,
                output: null,
                errorMessage: response.errorMessage,
            };
        }
    }
}

//prettier-ignore
type CodexApiResponse = {
    success: true;
    output: string;
} | {
    success: false;
    errorMessage: string;
};
