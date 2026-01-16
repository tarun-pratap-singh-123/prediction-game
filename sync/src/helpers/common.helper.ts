import axios from "axios";

export const fetchUrl = async (rawUrl: string): Promise<any> => {
    try {
        const response = await axios.get(rawUrl);
        // console.log(response.data, "Response response");
        return response.data
    } catch (error) {
        console.log( `error during fetching this ${rawUrl}`);
        return null;
    }
};